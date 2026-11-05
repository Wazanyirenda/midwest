import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getAmountPaidCents, getInvoice, type Invoice } from "@/lib/btcpay"
import { sendOrderConfirmationEmail, sendPaymentReviewEmail } from "@/lib/email"
import { queueOrderLabel } from "@/lib/print"

// Applies a BTCPay invoice's state to its order. The webhook, the success
// page's status check and the reconciliation sweep all come through here, so a
// payment is processed the same way — and exactly once — whichever of them
// notices it first. A webhook lost while the site was down is picked up by the
// next status check or sweep.
//
// Every caller passes an invoice read from BTCPay's API, never a webhook body,
// so nothing here acts on what a request merely claims.

const PROVIDER = "btcpay"

// Ledger keys shared by every path. The webhook's own event ids use the same
// shape, so a sweep and a late webhook for one payment collide on purpose.
const settledEventId = (invoiceId: string) => `${invoiceId}:InvoiceSettled`
const underpaidEventId = (invoiceId: string) => `${invoiceId}:InvoiceExpired`

export type SyncResult =
  | "paid"
  | "already-processed"
  | "underpaid"
  | "second-payment"
  | "unchanged"

/** Retires the cart that became this order, so it stops showing as a basket. */
async function retireCart(orderId: string) {
  const { data } = await supabase.from("orders").select("cart_id").eq("id", orderId).maybeSingle()
  if (!data?.cart_id) return
  await supabase
    .from("carts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", data.cart_id)
    .is("completed_at", null)
}

async function displayIdFor(orderId: string | undefined): Promise<number | null> {
  if (!orderId) return null
  const { data } = await supabase.from("orders").select("display_id").eq("id", orderId).maybeSingle()
  return (data?.display_id as number | undefined) ?? null
}

/**
 * Points the order at this invoice before it is processed. Normally a no-op —
 * checkout stored the reference — but a customer who went back to checkout got
 * a fresh invoice and may still pay the old one, which must count.
 *
 * "already-paid" means the order was settled by a different invoice: a second
 * payment for the same order, which needs a person, not a retry loop.
 */
async function bindInvoice(invoice: Invoice): Promise<"bound" | "already-paid" | "unknown"> {
  const orderId = invoice.metadata?.orderId
  if (!orderId) return "unknown"

  const { data: order } = await supabase
    .from("orders")
    .select("id,status,payment_reference")
    .eq("id", orderId)
    .eq("payment_provider", PROVIDER)
    .maybeSingle()
  if (!order) return "unknown"
  if (order.payment_reference === invoice.id) return "bound"
  if (order.status !== "pending") return "already-paid"

  await supabase
    .from("orders")
    .update({ payment_reference: invoice.id, updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "pending")
  return "bound"
}

async function applySettled(invoice: Invoice): Promise<SyncResult> {
  const binding = await bindInvoice(invoice)
  if (binding === "already-paid") {
    // Recorded so a second sweep doesn't mail the owner again.
    const { error } = await supabase
      .from("webhook_events")
      .insert({ provider: PROVIDER, event_id: settledEventId(invoice.id), type: "second-payment" })
    if (!error) {
      const displayId = await displayIdFor(invoice.metadata?.orderId)
      if (displayId !== null) {
        await sendPaymentReviewEmail({
          displayId,
          receivedCents: Math.round(Number(invoice.amount) * 100),
          expectedCents: 0,
          secondPayment: true,
        })
      }
    }
    return "second-payment"
  }

  // Raises when no order matches, which the webhook turns into a 500 so
  // BTCPay retries — the order may not be committed yet.
  const { data, error } = await supabase.rpc("process_payment_success", {
    p_provider: PROVIDER,
    p_event_id: settledEventId(invoice.id),
    p_event_type: "InvoiceSettled",
    p_payment_reference: invoice.id,
    // The invoice's own amount, which was created from the order total. A
    // shortfall inside the payment tolerance still settles at this amount.
    p_amount_cents: Math.round(Number(invoice.amount) * 100),
  })
  if (error) throw new Error(error.message)

  const result = data as { status?: string; order_id?: string } | null
  if (result?.status !== "processed" || !result.order_id) return "already-processed"

  await retireCart(result.order_id)
  // Inside the same one-shot gate as the email, so no path prints twice.
  await queueOrderLabel(result.order_id)

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id,display_id,email,total_cents,shipping_cents,subtotal_cents," +
        "created_at,status,payment_provider,shipping_address," +
        "items:order_items(product_title,variant_title,quantity,unit_price_cents)"
    )
    .eq("id", result.order_id)
    .maybeSingle()
  // Email failure must never undo a payment that is real.
  if (order) sendOrderConfirmationEmail(order as never).catch(() => {})
  return "paid"
}

async function applyUnderpaid(invoice: Invoice): Promise<SyncResult> {
  if ((await bindInvoice(invoice)) !== "bound") return "unchanged"

  const paidCents = await getAmountPaidCents(invoice.id)
  const { data, error } = await supabase.rpc("process_payment_underpaid", {
    p_provider: PROVIDER,
    p_event_id: underpaidEventId(invoice.id),
    p_event_type: "InvoiceExpired",
    p_payment_reference: invoice.id,
    p_amount_cents: paidCents,
  })
  if (error) throw new Error(error.message)

  if ((data as { status?: string } | null)?.status === "review") {
    const displayId = await displayIdFor(invoice.metadata?.orderId)
    if (displayId !== null) {
      await sendPaymentReviewEmail({
        displayId,
        receivedCents: paidCents,
        expectedCents: Math.round(Number(invoice.amount) * 100),
      })
    }
  }
  return "underpaid"
}

/** Acts on an invoice as BTCPay currently reports it. */
export async function syncInvoice(invoice: Invoice): Promise<SyncResult> {
  if (invoice.currency !== "USD") return "unchanged"
  if (invoice.status === "Settled") return applySettled(invoice)
  // Expired with money on it: the customer sent too little. It must not be
  // marked paid, and must not vanish either — it needs a person.
  if (invoice.status === "Expired" && invoice.additionalStatus === "PaidPartial") {
    return applyUnderpaid(invoice)
  }
  return "unchanged"
}

/**
 * Checks one pending order with BTCPay. Used by the success page while the
 * customer waits, so a payment whose webhook never arrived still completes.
 */
export async function syncOrder(orderId: string): Promise<SyncResult> {
  const { data: order } = await supabase
    .from("orders")
    .select("status,payment_provider,payment_reference")
    .eq("id", orderId)
    .maybeSingle()
  if (
    !order ||
    order.status !== "pending" ||
    order.payment_provider !== PROVIDER ||
    !order.payment_reference
  ) {
    return "unchanged"
  }
  return syncInvoice(await getInvoice(order.payment_reference as string))
}

// Long enough to cover a payment made late on an invoice that had expired, or
// a webhook outage over a weekend; short enough that the sweep stays small.
const SWEEP_DAYS = 7
const SWEEP_LIMIT = 50

/**
 * The backstop: every recent pending BTCPay order, checked against BTCPay.
 * One failing invoice is logged and skipped so it cannot hold up the rest.
 */
export async function reconcilePendingOrders(): Promise<{ checked: number; paid: number }> {
  const since = new Date(Date.now() - SWEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,payment_reference")
    .eq("payment_provider", PROVIDER)
    .eq("status", "pending")
    .is("payment_review_reason", null)
    .not("payment_reference", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(SWEEP_LIMIT)
  if (error) throw new Error(error.message)

  let paid = 0
  for (const order of orders ?? []) {
    try {
      const result = await syncInvoice(await getInvoice(order.payment_reference as string))
      if (result === "paid") paid += 1
    } catch (e) {
      console.error(`[btcpay] reconcile failed for order ${order.id}:`, e)
    }
  }
  return { checked: orders?.length ?? 0, paid }
}
