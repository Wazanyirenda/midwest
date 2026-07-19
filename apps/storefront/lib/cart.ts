import { cookies } from "next/headers"
import { supabaseAdmin as supabase } from "./supabase/admin"

export const CART_COOKIE = "cart_id"

export type CartItem = {
  id: string
  quantity: number
  unit_price: number
  variant: {
    id: string
    title: string
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
        "variant:product_variants(id,title,price_cents," +
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

export async function getCart(): Promise<Cart | null> {
  const cartId = await getCartId()
  if (!cartId) return null
  return getCartById(cartId)
}

export function formatCartTotal(amount: number | null | undefined): string {
  if (amount == null) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100)
}
