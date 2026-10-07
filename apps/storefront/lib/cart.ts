import { cache } from "react"
import { cookies } from "next/headers"
import { getUser } from "@/lib/auth"
import { supabaseAdmin as supabase } from "./supabase/admin"

export const CART_COOKIE = "cart_id"

export type CartItem = {
  id: string
  quantity: number
  unit_price: number
  variant: {
    id: string
    title: string
    inventory_quantity: number
    product: {
      title: string
      handle: string
      thumbnail: string | null
    }
  }
}

export type Cart = {
  id: string
  email: string | null
  shipping_address: Record<string, string> | null
  items: CartItem[]
  subtotal: number
  shipping_total: number
  discount_total: number
  total: number
}

export async function getCartId(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(CART_COOKIE)?.value
}

export async function getCartById(cartId: string): Promise<Cart | null> {
  const { data, error } = await supabase
    .from("carts")
    .select(
      "id,email,shipping_address,shipping_cents,completed_at," +
        "items:cart_items(id,quantity," +
        "variant:product_variants(id,title,price_cents,inventory_quantity," +
        "product:products(title,handle,thumbnail)))"
    )
    .eq("id", cartId)
    .maybeSingle()

  if (error || !data) return null

  type Row = {
    id: string
    completed_at: string | null
    email: string | null
    shipping_address: Record<string, string> | null
    shipping_cents: number | null
    items: Array<{
      id: string
      quantity: number
      variant: {
        id: string
        title: string
        price_cents: number
        inventory_quantity: number
        product: { title: string; handle: string; thumbnail: string | null }
      }
    }>
  }
  const row = data as unknown as Row
  if (row.completed_at) return null

  const items: CartItem[] = row.items.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    unit_price: i.variant.price_cents,
    variant: {
      id: i.variant.id,
      title: i.variant.title,
      inventory_quantity: i.variant.inventory_quantity,
      product: i.variant.product,
    },
  }))

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
  const shipping_total = row.shipping_cents ?? 0

  return {
    id: row.id,
    email: row.email,
    shipping_address: row.shipping_address,
    items,
    subtotal,
    shipping_total,
    discount_total: 0,
    total: subtotal + shipping_total,
  }
}

/**
 * Deduped per request via React cache(), like getSiteSettings. Rendering one
 * cart page asks for the cart three times — root layout (the floating cart
 * count), header, and the page itself — and each call is two round trips to
 * Supabase. Without this they all pay separately.
 *
 * Only this cookie-based read is cached. getCartById stays uncached on purpose:
 * the checkout actions call it either side of their own writes and need the
 * second call to see them.
 */
export const getCart = cache(async (): Promise<Cart | null> => {
  const cartId = await getCartId()
  if (!cartId) return null

  // A cart claimed by an account must never render for anyone else — including
  // the same browser after sign-out, where the cart_id cookie outlives the
  // session. Without this, the next person on a shared computer sees the
  // previous user's basket.
  const { data: owner } = await supabase
    .from("carts")
    .select("user_id")
    .eq("id", cartId)
    .maybeSingle()

  if (owner?.user_id) {
    const user = await getUser()
    if (!user || user.id !== owner.user_id) return null
  }

  return getCartById(cartId)
})

export function formatCartTotal(amount: number | null | undefined): string {
  if (amount == null) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100)
}
