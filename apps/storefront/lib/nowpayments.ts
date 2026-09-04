import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

// NOWPayments client and IPN verification.
//
// Ported from the retired Medusa provider, with two defects fixed: the old
// signature comparison was a plain string compare (timing-attack prone) and
// sorted only top-level keys, so any nested object in the payload failed.

const API_BASE = "https://api.nowpayments.io/v1"

export type InvoiceStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired"

/**
 * NOWPayments signs the JSON body with keys sorted RECURSIVELY, not just at the
 * top level. Sorting one level deep passes for flat payloads and then fails the
 * moment a nested object appears — which is how this silently breaks later.
 */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortDeep(v)])
    )
  }
  return value
}

export function verifyIpnSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret || !signature) return false

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return false
  }

  const expected = createHmac("sha512", secret)
    .update(JSON.stringify(sortDeep(parsed)))
    .digest("hex")

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set")

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    // Body may carry the API key back in an echo; log status only.
    throw new Error(`NOWPayments API ${res.status} on ${path}`)
  }
  return (await res.json()) as T
}

export type Invoice = {
  id: string
  invoice_url: string
  order_id: string
}

/**
 * Creates a hosted invoice. NOWPayments handles coin selection, the QR code and
 * the exact-amount display, which keeps wallet-specific edge cases out of this
 * codebase.
 *
 * price_amount is in dollars (the API is not cents-based) and is always taken
 * from the server-side cart total — never from the client.
 */
export async function createInvoice(input: {
  orderId: string
  amountCents: number
  successUrl: string
  cancelUrl: string
}): Promise<Invoice> {
  return request<Invoice>("/invoice", {
    method: "POST",
    body: JSON.stringify({
      price_amount: Number((input.amountCents / 100).toFixed(2)),
      price_currency: "usd",
      // Omitted so the customer picks their coin on the hosted page. Volatility
      // is handled by setting a fiat/stablecoin payout currency in the
      // NOWPayments dashboard — it is an account setting, not a per-invoice one.
      order_id: input.orderId,
      order_description: "Midwestern Peptides order",
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/nowpayments`,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  })
}

export async function getPaymentStatus(paymentId: string) {
  return request<{
    payment_id: string
    payment_status: InvoiceStatus
    price_amount: number
    actually_paid: number
    order_id: string
  }>(`/payment/${paymentId}`)
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET
  )
}
