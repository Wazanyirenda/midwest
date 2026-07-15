"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { CART_COOKIE } from "@/lib/cart"

async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CART_COOKIE)?.value

  if (existing) return existing

  const { data, error } = await supabase
    .from("carts")
    .insert({})
    .select("id")
    .single()
  if (error) throw new Error(`Could not create cart: ${error.message}`)

  cookieStore.set(CART_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return data.id
}

export async function addToCart(variantId: string, quantity = 1) {
  const cartId = await getOrCreateCartId()

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id)
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ cart_id: cartId, variant_id: variantId, quantity })
    if (error) throw new Error(`Could not add to cart: ${error.message}`)
  }

  revalidatePath("/cart")
  revalidatePath("/checkout")
}

export async function updateLineItemQuantity(
  cartId: string,
  lineItemId: string,
  quantity: number
) {
  if (quantity <= 0) {
    await supabase.from("cart_items").delete().eq("id", lineItemId).eq("cart_id", cartId)
  } else {
    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", lineItemId)
      .eq("cart_id", cartId)
  }

  revalidatePath("/cart")
  revalidatePath("/checkout")
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  await supabase.from("cart_items").delete().eq("id", lineItemId).eq("cart_id", cartId)
  revalidatePath("/cart")
  revalidatePath("/checkout")
}

export async function updateCartContact(
  cartId: string,
  data: {
    email: string
    first_name: string
    last_name: string
    phone?: string
    address_1: string
    address_2?: string
    city: string
    province: string
    postal_code: string
    country_code: string
  }
) {
  const { email, ...address } = data
  const { error } = await supabase
    .from("carts")
    .update({ email, shipping_address: address, updated_at: new Date().toISOString() })
    .eq("id", cartId)
  if (error) throw new Error(`Could not update cart: ${error.message}`)

  revalidatePath("/checkout")
}
