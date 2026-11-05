import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { configuredStoreId, getInvoice, verifyWebhookSignature } from "@/lib/btcpay"
import { syncInvoice } from "@/lib/btcpay-sync"

// BTCPay Server webhook. Same contract as the Stripe route: verify the
// signature over the RAW body, and return 500 (not 200) on a server fault so
// BTCPay retries.
//
// The payload is only a nudge. The invoice is read back from BTCPay's API and
// applied through lib/btcpay-sync.ts — the same exactly-once path the success
// page and the reconciliation sweep use — so a validly signed but stale or
// replayed event can only ever confirm what the invoice itself says.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROVIDER = "btcpay"

// Events that can change an order. Everything else is logged and acknowledged.
const ACTIONABLE = new Set(["InvoiceSettled", "InvoiceExpired"])

type WebhookEvent = {
  type?: string
  invoiceId?: string
  storeId?: string
}

export async function POST(request: Request) {
  if (!process.env.BTCPAY_WEBHOOK_SECRET || !configuredStoreId()) {
    console.error("[btcpay] webhook secret or store id not set")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  // Must be read as text: parsing first re-serialises and breaks the HMAC.
  const rawBody = await request.text()
  const signature = request.headers.get("btcpay-sig") ?? ""

  if (!verifyWebhookSignature(rawBody, signature)) {
    // 400, not 500 — a retry cannot fix an unverifiable request.
    console.warn("[btcpay] signature verification failed")
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(rawBody) as WebhookEvent
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const { type, invoiceId, storeId } = event
  if (!type) return NextResponse.json({ error: "incomplete payload" }, { status: 400 })

  // BTCPay's "send test webhook" button posts a synthetic invoice id. Answer it
  // so the dashboard shows the endpoint is reachable and signed correctly.
  if (invoiceId?.startsWith("__test__")) {
    return NextResponse.json({ received: true, result: "test" })
  }

  if (!invoiceId || storeId !== configuredStoreId()) {
    console.warn("[btcpay] event for another store or without an invoice")
    return NextResponse.json({ error: "unknown store" }, { status: 400 })
  }

  try {
    if (ACTIONABLE.has(type)) {
      const result = await syncInvoice(await getInvoice(invoiceId))
      return NextResponse.json({ received: true, result })
    }

    // Created, payment seen, processing, invalid: kept for the payments log.
    // A duplicate key is a redelivery and is fine to drop.
    await supabase
      .from("webhook_events")
      .insert({ provider: PROVIDER, event_id: `${invoiceId}:${type}`, type })
    return NextResponse.json({ received: true, result: "recorded" })
  } catch (e) {
    // 500 so BTCPay retries — never 200 for work that did not happen.
    console.error("[btcpay] processing failed:", e)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }
}
