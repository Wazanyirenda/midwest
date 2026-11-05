import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

// BTCPay Server client (Greenfield API v1) and webhook verification.
//
// BTCPay is self-hosted and non-custodial: the server only watches the store's
// wallet through its xpub, so customer payments land in the owner's wallet
// with nobody in between who could freeze or hold them. That is the reason it
// replaced NOWPayments for a catalogue card and hosted crypto processors both
// treat as high-risk.

export type InvoiceStatus = "New" | "Processing" | "Expired" | "Invalid" | "Settled"

export type InvoiceAdditionalStatus =
  | "None"
  | "PaidLate"
  | "PaidPartial"
  | "Marked"
  | "Invalid"
  | "PaidOver"

export type Invoice = {
  id: string
  storeId: string
  amount: string
  currency: string
  status: InvoiceStatus
  additionalStatus: InvoiceAdditionalStatus
  checkoutLink: string
  metadata?: { orderId?: string }
}

type PaymentMethod = {
  rate?: string
  paymentMethodPaid?: string
}

function config() {
  const url = process.env.BTCPAY_URL?.replace(/\/$/, "")
  const apiKey = process.env.BTCPAY_API_KEY
  const storeId = process.env.BTCPAY_STORE_ID
  if (!url || !apiKey || !storeId) throw new Error("BTCPay is not configured")
  return { url, apiKey, storeId }
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.BTCPAY_URL &&
      process.env.BTCPAY_API_KEY &&
      process.env.BTCPAY_STORE_ID &&
      process.env.BTCPAY_WEBHOOK_SECRET
  )
}

/** The store this deployment is bound to — webhooks for any other are refused. */
export function configuredStoreId(): string | undefined {
  return process.env.BTCPAY_STORE_ID
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, apiKey, storeId } = config()
  const res = await fetch(`${url}/api/v1/stores/${encodeURIComponent(storeId)}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  if (!res.ok) {
    // Status only: an error body can echo request details back.
    throw new Error(`BTCPay API ${res.status} on ${path.split("?")[0]}`)
  }
  return (await res.json()) as T
}

/**
 * Creates the invoice the customer pays on BTCPay's checkout page.
 *
 * The amount is always the server-side cart total, never anything from the
 * browser. Metadata carries only the order id — BTCPay keeps invoice metadata
 * indefinitely, and it is no place for a customer's name or address.
 */
export async function createInvoice(input: {
  orderId: string
  amountCents: number
  redirectUrl: string
  /** Shortfall BTCPay still treats as paid, in percent. Mirrors the site setting. */
  tolerancePercent: number
}): Promise<Invoice> {
  const invoice = await request<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify({
      amount: (input.amountCents / 100).toFixed(2),
      currency: "USD",
      metadata: { orderId: input.orderId },
      checkout: {
        redirectURL: input.redirectUrl,
        redirectAutomatically: true,
        paymentTolerance: input.tolerancePercent,
      },
    }),
  })

  // The browser is sent to this link, so it must be our own BTCPay server and
  // nothing else — a misconfigured or compromised response must not be able
  // to send a customer somewhere to pay a stranger.
  const { url } = config()
  if (!invoice.checkoutLink?.startsWith(`${url}/`)) {
    throw new Error("BTCPay returned a checkout link outside the configured server")
  }
  return invoice
}

export function getInvoice(invoiceId: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${encodeURIComponent(invoiceId)}`)
}

/**
 * What the customer actually sent, in invoice currency (USD cents). BTCPay
 * reports payments per payment method in that method's own unit, so each is
 * converted at the invoice's locked rate before summing.
 */
export async function getAmountPaidCents(invoiceId: string): Promise<number> {
  const methods = await request<PaymentMethod[]>(
    `/invoices/${encodeURIComponent(invoiceId)}/payment-methods`
  )
  let total = 0
  for (const m of methods) {
    const paid = Number(m.paymentMethodPaid ?? 0)
    const rate = Number(m.rate ?? 0)
    if (Number.isFinite(paid) && Number.isFinite(rate)) total += paid * rate
  }
  return Math.round(total * 100)
}

/**
 * BTCPay signs the raw body: `BTCPay-Sig: sha256=<hex HMAC-SHA256>`. Checked
 * over the exact bytes received — parsing and re-serialising first changes
 * them and fails every signature.
 */
export function verifyWebhookSignature(rawBody: string, header: string): boolean {
  const secret = process.env.BTCPAY_WEBHOOK_SECRET
  if (!secret || !header.startsWith("sha256=")) return false

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  const a = Buffer.from(header.slice("sha256=".length), "utf8")
  const b = Buffer.from(expected, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}
