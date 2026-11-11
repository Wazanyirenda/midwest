import "server-only"
import type { User } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { ReceiptOrder } from "@/lib/receipt-pdf"

export type OrderListItem = {
  id: string
  order_code: string
  created_at: string
  status: string
  total: number
  items: Array<{ title: string; quantity: number }>
}

/** What a manual crypto order told the customer to pay, and what they sent. */
export type ManualPayment = {
  asset: string
  network: string
  address: string
  amount: string
  quotedAt: string | null
  txid: string | null
  submittedAt: string | null
}

export type OrderDetail = {
  id: string
  order_code: string
  created_at: string
  status: string
  db_status: string
  email: string
  total: number
  subtotal: number
  shipping_total: number
  tax_total: number
  payment_method: string
  tracking_number: string | null
  tracking_carrier: string | null
  cancellation_requested_at: string | null
  cancel_reason: string | null
  /** Present only for orders paid by hand in BTC, USDT or USDC. */
  manual_payment: ManualPayment | null
  shipping_address: {
    first_name: string
    last_name: string
    phone?: string
    address_1: string
    address_2?: string
    city: string
    province: string
    postal_code: string
  } | null
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
    variant_id: string | null
  }>
}

type OrderRow = {
  id: string
  order_code: string
  email: string
  user_id: string | null
  status: string
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  shipping_address: OrderDetail["shipping_address"]
  payment_provider: string | null
  tracking_number: string | null
  tracking_carrier: string | null
  cancellation_requested_at: string | null
  cancel_reason: string | null
  payment_asset: string | null
  payment_network: string | null
  payment_address: string | null
  payment_amount_crypto: number | string | null
  payment_quoted_at: string | null
  payment_txid: string | null
  payment_submitted_at: string | null
  created_at: string
  items: Array<{
    id: string
    product_title: string
    variant_title: string | null
    quantity: number
    unit_price_cents: number
    variant_id: string | null
  }>
}

const ORDER_FIELDS =
  "id,order_code,email,user_id,status,subtotal_cents,shipping_cents,total_cents," +
  "shipping_address,payment_provider,tracking_number,tracking_carrier," +
  "cancellation_requested_at,cancel_reason,created_at," +
  "payment_asset,payment_network,payment_address,payment_amount_crypto," +
  "payment_quoted_at,payment_txid,payment_submitted_at," +
  "items:order_items(id,product_title,variant_title,quantity,unit_price_cents,variant_id)"

// Customers see "processing" for a paid-but-not-shipped order; the DB keeps
// the payment-centric vocabulary.
export function toDisplayStatus(dbStatus: string): string {
  return dbStatus === "paid" ? "processing" : dbStatus
}

function itemTitle(item: OrderRow["items"][number]): string {
  return item.variant_title
    ? `${item.product_title} — ${item.variant_title}`
    : item.product_title
}

function paymentMethodLabel(provider: string | null, asset?: string | null): string {
  if (provider === "stripe") return "Card (Stripe)"
  if (provider === "btcpay") return "Crypto"
  if (provider === "manual") return asset ? `Crypto (${asset})` : "Crypto"
  return "—"
}

function manualPayment(order: OrderRow): ManualPayment | null {
  if (order.payment_provider !== "manual" || !order.payment_asset || !order.payment_network) return null
  return {
    asset: order.payment_asset,
    network: order.payment_network,
    address: order.payment_address ?? "",
    amount: String(order.payment_amount_crypto ?? ""),
    quotedAt: order.payment_quoted_at,
    txid: order.payment_txid,
    submittedAt: order.payment_submitted_at,
  }
}

/**
 * Orders placed as a guest are linked only by email, so a signed-in user is
 * allowed to claim them — but ONLY once that email is confirmed. Without this
 * check, registering as victim@example.com and never confirming would expose
 * their guest orders.
 */
function claimableEmail(user: User): string | null {
  if (!user.email) return null
  if (!user.email_confirmed_at) return null
  return user.email.toLowerCase()
}

function ownsOrder(order: OrderRow, user: User): boolean {
  if (order.user_id === user.id) return true

  // An order already owned by an account belongs to that account, even if the
  // email matches. Only unclaimed guest orders are claimable by email — this
  // must stay in step with the filters in getOrdersForUser.
  if (order.user_id !== null) return false

  const email = claimableEmail(user)
  return !!email && order.email.toLowerCase() === email
}

export async function getOrdersForUser(user: User): Promise<OrderListItem[]> {
  const email = claimableEmail(user)

  // Two parameterized queries rather than one interpolated .or() filter string.
  // supabase-js has no parameterized OR, and building the filter by
  // interpolation puts user-controlled text into a parser — quote-stripping is
  // a blocklist, and blocklists rot. Values passed to .eq() are sent as
  // parameters and can never be read as filter syntax.
  const [byUserId, byEmail] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select(ORDER_FIELDS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    email
      ? supabaseAdmin
          .from("orders")
          .select(ORDER_FIELDS)
          .is("user_id", null) // only unclaimed guest orders
          .eq("email", email)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (byUserId.error || byEmail.error) {
    console.error(
      "Could not load orders:",
      byUserId.error?.message ?? byEmail.error?.message
    )
    return []
  }

  // Merge and de-duplicate; an order could match both filters.
  const seen = new Map<string, OrderRow>()
  for (const row of [
    ...((byUserId.data ?? []) as unknown as OrderRow[]),
    ...((byEmail.data ?? []) as unknown as OrderRow[]),
  ]) {
    seen.set(row.id, row)
  }

  return [...seen.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => ({
      id: o.id,
      order_code: o.order_code,
      created_at: o.created_at,
      status: toDisplayStatus(o.status),
      total: o.total_cents,
      items: o.items.map((i) => ({ title: itemTitle(i), quantity: i.quantity })),
    }))
}

export async function getOrderById(
  id: string,
  user: User
): Promise<OrderDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  const order = data as unknown as OrderRow
  if (!ownsOrder(order, user)) return null

  return {
    id: order.id,
    order_code: order.order_code,
    created_at: order.created_at,
    status: toDisplayStatus(order.status),
    db_status: order.status,
    email: order.email,
    total: order.total_cents,
    subtotal: order.subtotal_cents,
    shipping_total: order.shipping_cents,
    tax_total: 0,
    payment_method: paymentMethodLabel(order.payment_provider, order.payment_asset),
    tracking_number: order.tracking_number,
    tracking_carrier: order.tracking_carrier,
    cancellation_requested_at: order.cancellation_requested_at,
    cancel_reason: order.cancel_reason,
    manual_payment: manualPayment(order),
    shipping_address: order.shipping_address,
    items: order.items.map((i) => ({
      id: i.id,
      title: itemTitle(i),
      quantity: i.quantity,
      unit_price: i.unit_price_cents,
      variant_id: i.variant_id,
    })),
  }
}

// A receipt is proof money was taken. A pending order has nothing to show yet,
// and a canceled or refunded one would be proof of a sale that did not stand.
const RECEIPT_STATUSES = new Set(["paid", "shipped", "delivered"])

export function hasReceipt(dbStatus: string): boolean {
  return RECEIPT_STATUSES.has(dbStatus)
}

/** The PDF receipt's view of an order — its owner only, and only once paid. */
export async function getReceiptForUser(
  id: string,
  user: User
): Promise<ReceiptOrder | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  const order = data as unknown as OrderRow
  if (!ownsOrder(order, user) || !hasReceipt(order.status)) return null

  return {
    displayId: order.order_code,
    createdAt: order.created_at,
    email: order.email,
    status: order.status,
    paymentProvider: order.payment_provider,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    shippingAddress: order.shipping_address,
    items: order.items.map((i) => ({
      productTitle: i.product_title,
      variantTitle: i.variant_title,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
    })),
  }
}

const CARRIER_URLS: Record<string, (num: string) => string> = {
  usps: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${n}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  dhl: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
}

export function carrierTrackingUrl(
  carrier: string | null,
  trackingNumber: string | null
): string | null {
  if (!carrier || !trackingNumber) return null
  const build = CARRIER_URLS[carrier.toLowerCase()]
  return build ? build(encodeURIComponent(trackingNumber)) : null
}
