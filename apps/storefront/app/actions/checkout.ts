"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"
import { getCartById, CART_COOKIE } from "@/lib/cart"
import { getShippingOptions } from "@/lib/shipping"

// ─── Shipping ─────────────────────────────────────────────────────────────────

export async function listShippingOptions(cartId: string) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")
  return getShippingOptions(cart.subtotal)
}

export async function addShippingMethod(cartId: string, optionId: string) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")

  const option = getShippingOptions(cart.subtotal).find((o) => o.id === optionId)
  if (!option) throw new Error("Unknown shipping option")

  await supabase
    .from("carts")
    .update({ shipping_cents: option.amount, updated_at: new Date().toISOString() })
    .eq("id", cartId)

  revalidatePath("/checkout")
  return getCartById(cartId)
}

// ─── Payment ──────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Card payments are not configured yet (missing STRIPE_SECRET_KEY).")
  }
  return new Stripe(key)
}

export async function initiatePaymentSession(
  cartId: string,
  providerId: "stripe" | "nowpayments"
) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")

  if (providerId === "nowpayments") {
    // Wired up in the crypto payments phase.
    throw new Error("Crypto payments are not available yet. Please pay by card.")
  }

  const stripe = getStripe()
  const intent = await stripe.paymentIntents.create({
    amount: cart.total,
    currency: "usd",
    receipt_email: cart.email ?? undefined,
    metadata: { cart_id: cart.id },
    automatic_payment_methods: { enabled: true },
  })

  // Mirror the payment_collection shape the checkout form reads.
  return {
    payment_sessions: [
      { provider_id: "stripe", data: { client_secret: intent.client_secret } },
    ],
  }
}

// ─── Order completion ─────────────────────────────────────────────────────────

export async function completeCart(cartId: string) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")
  if (!cart.email) throw new Error("Cart is missing contact information")
  if (cart.items.length === 0) throw new Error("Cart is empty")

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      cart_id: cart.id,
      email: cart.email,
      shipping_address: cart.shipping_address,
      subtotal_cents: cart.subtotal,
      shipping_cents: cart.shipping_total,
      total_cents: cart.total,
      status: "paid",
      payment_provider: "stripe",
    })
    .select("id,display_id")
    .single()
  if (error) throw new Error(`Could not create order: ${error.message}`)

  const { error: itemsError } = await supabase.from("order_items").insert(
    cart.items.map((i) => ({
      order_id: order.id,
      variant_id: i.variant.id,
      product_title: i.variant.product.title,
      variant_title: i.variant.title,
      quantity: i.quantity,
      unit_price_cents: i.unit_price,
    }))
  )
  if (itemsError) throw new Error(`Could not save order items: ${itemsError.message}`)

  await supabase.rpc("decrement_inventory", {
    items: cart.items.map((i) => ({ variant_id: i.variant.id, quantity: i.quantity })),
  })

  await supabase
    .from("carts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", cart.id)

  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE)

  revalidatePath("/checkout/success")
  return { type: "order" as const, order: { id: order.id, display_id: order.display_id } }
}
