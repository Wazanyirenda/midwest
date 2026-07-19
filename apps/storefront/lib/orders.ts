import "server-only"
import type { User } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type OrderListItem = {
  id: string
  display_id: number
  created_at: string
  status: string
  total: number
  items: Array<{ title: string; quantity: number }>
}

export type OrderDetail = {
  id: string
  display_id: number
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
  display_id: number
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
  "id,display_id,email,user_id,status,subtotal_cents,shipping_cents,total_cents," +
  "shipping_address,payment_provider,tracking_number,tracking_carrier," +
  "cancellation_requested_at,created_at," +
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

function paymentMethodLabel(provider: string | null): string {
  if (provider === "stripe") return "Card (Stripe)"
  if (provider === "nowpayments") return "Crypto"
  return "—"
}

function ownsOrder(order: OrderRow, user: User): boolean {
  return (
    order.user_id === user.id ||
    (!!user.email && order.email.toLowerCase() === user.email.toLowerCase())
  )
}

export async function getOrdersForUser(user: User): Promise<OrderListItem[]> {
  const email = (user.email ?? "").replace(/"/g, "")
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(ORDER_FIELDS)
    .or(`user_id.eq.${user.id},email.eq."${email}"`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Could not load orders:", error.message)
    return []
  }

  return ((data ?? []) as unknown as OrderRow[]).map((o) => ({
    id: o.id,
    display_id: o.display_id,
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
    display_id: order.display_id,
    created_at: order.created_at,
    status: toDisplayStatus(order.status),
    db_status: order.status,
    email: order.email,
    total: order.total_cents,
    subtotal: order.subtotal_cents,
    shipping_total: order.shipping_cents,
    tax_total: 0,
    payment_method: paymentMethodLabel(order.payment_provider),
    tracking_number: order.tracking_number,
    tracking_carrier: order.tracking_carrier,
    cancellation_requested_at: order.cancellation_requested_at,
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
