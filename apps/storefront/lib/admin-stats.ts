import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"

// Statuses that represent money actually collected. 'pending' is an
// unpaid/abandoned checkout and must never count toward revenue.
const REVENUE_STATUSES = ["paid", "shipped", "delivered"]

export type LowStockRow = {
  id: string
  title: string
  sku: string
  inventory_quantity: number
  reorder_point: number
  product_id: string
  product_title: string
}

export type DaySlice = { date: string; revenue_cents: number; orders: number }

export type DashboardStats = {
  revenueCents: number
  revenuePrevCents: number
  orderCount: number
  orderCountPrev: number
  aovCents: number
  unitsSold: number
  productCount: number
  publishedCount: number
  pendingCount: number
  /** Pending over an hour — the webhook never landed, or payment was abandoned. */
  stalePendingCount: number
  cancellationRequests: number
  series: DaySlice[]
  lowStock: LowStockRow[]
  outOfStock: LowStockRow[]
}

function startOfDayUTC(daysAgo: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d
}

/**
 * Everything the admin overview needs, in one round of parallel queries.
 * `days` is the trailing window; the previous window of equal length is also
 * fetched so each headline number can show a real change figure.
 */
export async function getDashboardStats(days = 30): Promise<DashboardStats> {
  const windowStart = startOfDayUTC(days - 1)
  const prevStart = startOfDayUTC(days * 2 - 1)

  const [
    ordersRes,
    prevOrdersRes,
    variantsRes,
    productsRes,
    pendingRes,
    stalePendingRes,
    cancelRes,
  ] = await Promise.all([
      supabase
        .from("orders")
        .select("id,total_cents,status,created_at,items:order_items(quantity)")
        .in("status", REVENUE_STATUSES)
        .gte("created_at", windowStart.toISOString()),
      supabase
        .from("orders")
        .select("id,total_cents")
        .in("status", REVENUE_STATUSES)
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", windowStart.toISOString()),
      supabase
        .from("product_variants")
        .select(
          "id,title,sku,inventory_quantity,reorder_point,product_id,product:products(title)"
        )
        .order("inventory_quantity"),
      supabase.from("products").select("status"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      // A pending order older than an hour means the Stripe webhook never
      // arrived (or the customer walked away mid-payment). Worth a look.
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("cancellation_requested_at", "is", null)
        .in("status", ["pending", "paid"]),
    ])

  type OrderRow = {
    id: string
    total_cents: number
    status: string
    created_at: string
    items: Array<{ quantity: number }>
  }
  const orders = (ordersRes.data ?? []) as unknown as OrderRow[]
  const prevOrders = prevOrdersRes.data ?? []

  const revenueCents = orders.reduce((sum, o) => sum + o.total_cents, 0)
  const revenuePrevCents = prevOrders.reduce((sum, o) => sum + o.total_cents, 0)
  const unitsSold = orders.reduce(
    (sum, o) => sum + o.items.reduce((n, i) => n + i.quantity, 0),
    0
  )

  // Seed every day in the window so the chart has no gaps on quiet days.
  const buckets = new Map<string, DaySlice>()
  for (let i = days - 1; i >= 0; i--) {
    const key = startOfDayUTC(i).toISOString().slice(0, 10)
    buckets.set(key, { date: key, revenue_cents: 0, orders: 0 })
  }
  for (const order of orders) {
    const key = order.created_at.slice(0, 10)
    const slice = buckets.get(key)
    if (slice) {
      slice.revenue_cents += order.total_cents
      slice.orders += 1
    }
  }

  type VariantRow = {
    id: string
    title: string
    sku: string
    inventory_quantity: number
    reorder_point: number
    product_id: string
    product: { title: string } | null
  }
  const variants = (variantsRes.data ?? []) as unknown as VariantRow[]
  const flagged: LowStockRow[] = variants
    .filter((v) => v.inventory_quantity <= v.reorder_point)
    .map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      inventory_quantity: v.inventory_quantity,
      reorder_point: v.reorder_point,
      product_id: v.product_id,
      product_title: v.product?.title ?? "Unknown product",
    }))

  const products = productsRes.data ?? []

  return {
    revenueCents,
    revenuePrevCents,
    orderCount: orders.length,
    orderCountPrev: prevOrders.length,
    aovCents: orders.length ? Math.round(revenueCents / orders.length) : 0,
    unitsSold,
    productCount: products.length,
    publishedCount: products.filter((p) => p.status === "published").length,
    pendingCount: pendingRes.count ?? 0,
    stalePendingCount: stalePendingRes.count ?? 0,
    cancellationRequests: cancelRes.count ?? 0,
    series: [...buckets.values()],
    lowStock: flagged.filter((v) => v.inventory_quantity > 0),
    outOfStock: flagged.filter((v) => v.inventory_quantity === 0),
  }
}

/** Best sellers by units, over the same trailing window as the dashboard. */
export async function getTopProducts(days = 30, limit = 5) {
  const { data } = await supabase
    .from("order_items")
    .select(
      "product_title,quantity,unit_price_cents,order:orders!inner(status,created_at)"
    )
    .in("order.status", REVENUE_STATUSES)
    .gte("order.created_at", startOfDayUTC(days - 1).toISOString())

  type Row = { product_title: string; quantity: number; unit_price_cents: number }
  const rows = (data ?? []) as unknown as Row[]

  const totals = new Map<string, { units: number; revenue_cents: number }>()
  for (const row of rows) {
    const entry = totals.get(row.product_title) ?? { units: 0, revenue_cents: 0 }
    entry.units += row.quantity
    entry.revenue_cents += row.quantity * row.unit_price_cents
    totals.set(row.product_title, entry)
  }

  return [...totals.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit)
}

/** Percentage change, guarding the divide-by-zero cold-start case. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}
