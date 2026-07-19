import "server-only"
import type { User } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOrdersForUser, type OrderListItem } from "@/lib/orders"

export type AccountSummary = {
  orderCount: number
  activeOrderCount: number
  totalSpentCents: number
  wishlistCount: number
  addressCount: number
  recentOrders: OrderListItem[]
  defaultAddress: {
    first_name: string
    last_name: string
    address_1: string
    address_2: string | null
    city: string
    province: string
    postal_code: string
  } | null
}

// Single fetch for the dashboard. Reads are soft-fail: a missing piece should
// degrade one tile, not blank the page.
export async function getAccountSummary(user: User): Promise<AccountSummary> {
  const [orders, wishlist, addresses, defaultAddress] = await Promise.all([
    getOrdersForUser(user),
    supabaseAdmin
      .from("wishlists")
      .select("id,items:wishlist_items(id)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabaseAdmin
      .from("addresses")
      .select("first_name,last_name,address_1,address_2,city,province,postal_code")
      .eq("user_id", user.id)
      .eq("is_default_shipping", true)
      .maybeSingle(),
  ])

  const wishlistItems =
    (wishlist.data?.items as unknown as Array<{ id: string }> | null) ?? []

  return {
    orderCount: orders.length,
    activeOrderCount: orders.filter((o) =>
      ["pending", "processing", "shipped"].includes(o.status)
    ).length,
    totalSpentCents: orders
      .filter((o) => o.status !== "canceled")
      .reduce((sum, o) => sum + o.total, 0),
    wishlistCount: wishlistItems.length,
    addressCount: addresses.count ?? 0,
    recentOrders: orders.slice(0, 3),
    defaultAddress: defaultAddress.data ?? null,
  }
}
