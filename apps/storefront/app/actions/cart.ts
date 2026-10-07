"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { CART_COOKIE } from "@/lib/cart"
import { getUser } from "@/lib/auth"

export async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CART_COOKIE)?.value

  if (existing) return existing

  // Carts created while signed in are owned immediately, so they follow the
  // user across devices without waiting for the next sign-in merge.
  const user = await getUser()
  const { data, error } = await supabase
    .from("carts")
    .insert({ user_id: user?.id ?? null })
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

/**
 * Units of a variant a cart line may hold. Read here rather than taken from the
 * caller: the cart's quantity stepper disabling itself at the limit is a hint to
 * the customer, not a boundary a crafted request has to respect.
 */
async function availableStock(variantId: string): Promise<number> {
  const { data } = await supabase
    .from("product_variants")
    .select("inventory_quantity")
    .eq("id", variantId)
    .maybeSingle()
  return Math.max(0, data?.inventory_quantity ?? 0)
}

export async function addToCart(variantId: string, quantity = 1) {
  const requested = Math.max(1, Math.floor(quantity))
  const available = await availableStock(variantId)

  // Nothing left to sell. The add button is already disabled on a current page,
  // so this is a stale tab or a forged call — revalidate and add nothing, which
  // refreshes the page into showing the item as unavailable.
  if (available === 0) {
    revalidatePath("/", "layout")
    return
  }

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
      .update({ quantity: Math.min(existing.quantity + requested, available) })
      .eq("id", existing.id)
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cartId,
        variant_id: variantId,
        quantity: Math.min(requested, available),
      })
    if (error) throw new Error(`Could not add to cart: ${error.message}`)
  }

  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/", "layout")
}

/**
 * Moves a line's quantity by `delta`, relative to whatever is in the database
 * right now.
 *
 * Deliberately relative rather than an absolute target. A server action bound
 * in a server component captures its arguments when the page renders, so an
 * absolute quantity is a snapshot: tap "+" twice before the re-render lands and
 * the second tap re-sends the first tap's number, leaving the count apparently
 * frozen. A delta is correct no matter how stale the page that sent it is.
 */
export async function changeLineItemQuantity(
  cartId: string,
  lineItemId: string,
  delta: number
) {
  // Scoped by cart id for the same reason removeLineItem is: the id comes from
  // the caller and must never touch another cart's lines.
  const { data: line } = await supabase
    .from("cart_items")
    .select("quantity,variant_id")
    .eq("id", lineItemId)
    .eq("cart_id", cartId)
    .maybeSingle()
  if (!line) return

  const wanted = line.quantity + Math.trunc(delta)

  if (wanted <= 0) {
    await supabase.from("cart_items").delete().eq("id", lineItemId).eq("cart_id", cartId)
  } else {
    // Capped at stock so the quantity can't be raised past what we can ship.
    const capped = Math.min(wanted, await availableStock(line.variant_id))
    if (capped > 0 && capped !== line.quantity) {
      await supabase
        .from("cart_items")
        .update({ quantity: capped })
        .eq("id", lineItemId)
        .eq("cart_id", cartId)
    }
  }

  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/", "layout")
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  await supabase.from("cart_items").delete().eq("id", lineItemId).eq("cart_id", cartId)
  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/", "layout")
}

/**
 * Empties a cart without retiring it, so the same cart id keeps working and the
 * cookie stays valid. Scoped by cart id for the same reason removeLineItem is:
 * the id comes from the caller and must never delete another cart's lines.
 */
export async function clearCart(cartId: string) {
  await supabase.from("cart_items").delete().eq("cart_id", cartId)
  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/", "layout")
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
