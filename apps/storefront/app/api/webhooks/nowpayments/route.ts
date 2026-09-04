import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { verifyIpnSignature, type InvoiceStatus } from "@/lib/nowpayments"
import { getSiteSettings } from "@/lib/settings"
import { sendOrderConfirmationEmail } from "@/lib/email"

// NOWPayments IPN. Same contract as the Stripe route: verify the signature over
// the RAW body, process exactly once through the webhook_events ledger, and
// return 500 (not 200) on a server fault so the provider retries.
//
// Crypto makes the webhook even more load-bearing than cards do — the customer
// pays from their own wallet on their own schedule, and confirmation can take
// minutes to hours. Nothing in the browser can be trusted to report it.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROVIDER = "nowpayments"

// Only 'finished' means funds have settled to the account. 'confirmed' means the
// transaction is on-chain but not yet settled — shipping physical product on it
// carries a real, if small, risk window.
const PAID_STATUSES: InvoiceStatus[] = ["finished"]
const FAILED_STATUSES: InvoiceStatus[] = ["failed", "expired", "refunded"]

type Ipn = {
  payment_id: string | number
  payment_status: InvoiceStatus
  order_id?: string
  price_amount?: number
  actually_paid?: number
  pay_currency?: string
}

export async function POST(request: Request) {
  if (!process.env.NOWPAYMENTS_IPN_SECRET) {
    console.error("[nowpayments] NOWPAYMENTS_IPN_SECRET not set")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  // Must be read as text: parsing first re-serialises and breaks the HMAC.
  const rawBody = await request.text()
  const signature = request.headers.get("x-nowpayments-sig") ?? ""

  if (!verifyIpnSignature(rawBody, signature)) {
    // 400, not 500 — a retry cannot fix an unverifiable request.
    console.warn("[nowpayments] signature verification failed")
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  let ipn: Ipn
  try {
    ipn = JSON.parse(rawBody) as Ipn
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const paymentId = String(ipn.payment_id ?? "")
  const status = ipn.payment_status
  if (!paymentId || !status) {
    return NextResponse.json({ error: "incomplete payload" }, { status: 400 })
  }

  // One event id per (payment, status) so each transition is processed once but
  // later transitions still get through — a single payment legitimately reports
  // waiting → confirming → finished.
  const eventId = `${paymentId}:${status}`

  try {
    // The IPN reports payment_id, but checkout stored the INVOICE id as the
    // reference — they are different values. order_id round-trips from the
    // invoice we created, so use it to bind the payment id to the order before
    // any lookup by reference happens.
    if (ipn.order_id) {
      await supabase
        .from("orders")
        .update({ payment_reference: paymentId })
        .eq("id", ipn.order_id)
        .eq("payment_provider", PROVIDER)
    }

    if (PAID_STATUSES.includes(status)) {
      const expectedCents = Math.round((ipn.price_amount ?? 0) * 100)
      const paidCents = Math.round((ipn.actually_paid ?? 0) * 100)

      // Network fees mean an exact match is rare; the owner sets the tolerance.
      const { cryptoTolerancePercent } = await getSiteSettings()
      const shortfall = expectedCents - paidCents
      const allowed = Math.ceil((expectedCents * cryptoTolerancePercent) / 100)

      if (paidCents > 0 && shortfall > allowed) {
        const { error } = await supabase.rpc("process_payment_underpaid", {
          p_provider: PROVIDER,
          p_event_id: eventId,
          p_event_type: status,
          p_payment_reference: paymentId,
          p_amount_cents: paidCents,
        })
        if (error) throw new Error(error.message)
        return NextResponse.json({ received: true, result: "underpaid" })
      }

      const { data, error } = await supabase.rpc("process_payment_success", {
        p_provider: PROVIDER,
        p_event_id: eventId,
        p_event_type: status,
        p_payment_reference: paymentId,
        // The order's own total, so a tolerated shortfall does not trip the
        // amount-mismatch guard inside the function.
        p_amount_cents: expectedCents,
      })
      if (error) throw new Error(error.message)

      const result = data as { status?: string; order_id?: string } | null
      if (result?.status === "paid" && result.order_id) {
        const { data: order } = await supabase
          .from("orders")
          .select(
            "id,display_id,email,total_cents,shipping_cents,subtotal_cents," +
              "items:order_items(product_title,variant_title,quantity,unit_price_cents)"
          )
          .eq("id", result.order_id)
          .maybeSingle()
        // Email failure must never fail the webhook — the payment is real.
        if (order) sendOrderConfirmationEmail(order as never).catch(() => {})
      }

      return NextResponse.json({ received: true, result: result?.status })
    }

    if (FAILED_STATUSES.includes(status)) {
      // Record it for the payments log; the order stays pending so the customer
      // can be offered a fresh invoice.
      await supabase
        .from("webhook_events")
        .insert({ provider: PROVIDER, event_id: eventId, type: status })
      return NextResponse.json({ received: true, result: "recorded" })
    }

    // waiting / confirming / sending: acknowledge without changing order state.
    await supabase
      .from("webhook_events")
      .insert({ provider: PROVIDER, event_id: eventId, type: status })
    return NextResponse.json({ received: true, result: "pending" })
  } catch (e) {
    // 500 so NOWPayments retries — never 200 for work that did not happen.
    console.error("[nowpayments] processing failed:", e)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }
}
