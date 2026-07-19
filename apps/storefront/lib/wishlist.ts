import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type WishlistItem = {
  id: string
  variant_id: string | null
  created_at: string
  product: {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
    variants: Array<{
      id: string
      title: string
      price_cents: number
      inventory_quantity: number
    }>
  }
}

export type Wishlist = {
  id: string
  share_token: string
  items: WishlistItem[]
}

const ITEM_FIELDS =
  "id,variant_id,created_at," +
  "product:products(id,title,handle,thumbnail,status," +
  "variants:product_variants(id,title,price_cents,inventory_quantity))"

export async function getOrCreateWishlist(
  userId: string
): Promise<{ id: string; share_token: string }> {
  const { data: existing } = await supabaseAdmin
    .from("wishlists")
    .select("id,share_token")
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabaseAdmin
    .from("wishlists")
    .insert({ user_id: userId })
    .select("id,share_token")
    .single()
  if (error) throw new Error(`Could not create wishlist: ${error.message}`)
  return data
}

export async function getWishlistWithItems(userId: string): Promise<Wishlist> {
  const wishlist = await getOrCreateWishlist(userId)

  const { data } = await supabaseAdmin
    .from("wishlist_items")
    .select(ITEM_FIELDS)
    .eq("wishlist_id", wishlist.id)
    .order("created_at", { ascending: false })

  return {
    ...wishlist,
    items: ((data ?? []) as unknown as WishlistItem[]).filter((i) => i.product),
  }
}

// Cheap lookup for rendering heart state on product grids.
export async function getWishlistedProductIds(userId: string): Promise<Set<string>> {
  const { data: wishlist } = await supabaseAdmin
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (!wishlist) return new Set()

  const { data } = await supabaseAdmin
    .from("wishlist_items")
    .select("product_id")
    .eq("wishlist_id", wishlist.id)
  return new Set((data ?? []).map((r) => r.product_id as string))
}

// Public share page: read-only, published products only.
export async function getWishlistByShareToken(
  token: string
): Promise<Wishlist | null> {
  const { data: wishlist } = await supabaseAdmin
    .from("wishlists")
    .select("id,share_token")
    .eq("share_token", token)
    .maybeSingle()
  if (!wishlist) return null

  const { data } = await supabaseAdmin
    .from("wishlist_items")
    .select(ITEM_FIELDS)
    .eq("wishlist_id", wishlist.id)
    .order("created_at", { ascending: false })

  const items = ((data ?? []) as unknown as WishlistItem[]).filter(
    (i) => i.product && i.product.status === "published"
  )
  return { ...wishlist, items }
}
