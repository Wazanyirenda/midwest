"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getCartById, CART_COOKIE } from "@/lib/cart"
import { getShippingOptions } from "@/lib/shipping"
import { getUser } from "@/lib/auth"
// Confirmation mail is sent by the Stripe webhook, not from here — see
// app/api/webhooks/stripe/route.ts.

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

/**
 * Creates the PaymentIntent *and* a pending order before any money moves.
 *
 * The order existing up front is what makes the webhook reliable: it gives the
 * provider's callback something to find by `payment_reference`, and it means a
 * charge can never succeed against an order we have no record of. The webhook
 * is the only thing that may mark it paid.
 *
 * Safe to call repeatedly — stepping back and forth in checkout reuses the same
 * pending order and PaymentIntent rather than stacking up duplicates.
 */
export async function initiatePaymentSession(
  cartId: string,
  providerId: "stripe" | "nowpayments"
) {
  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")
  if (!cart.email) throw new Error("Cart is missing contact information")
  if (cart.items.length === 0) throw new Error("Cart is empty")

  if (providerId === "nowpayments") {
    // Wired up in the crypto payments phase.
    throw new Error("Crypto payments are not available yet. Please pay by card.")
  }

  const stripe = getStripe()
  const user = await getUser()

  const { data: existing } = await supabase
    .from("orders")
    .select("id,status,payment_reference,total_cents")
    .eq("cart_id", cart.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let intent: Stripe.PaymentIntent | null = null

  if (existing?.payment_reference) {
    try {
      const found = await stripe.paymentIntents.retrieve(existing.payment_reference)
      // A succeeded/processing intent must not be mutated — the webhook owns it
      // from here. Anything still awaiting payment can be re-priced.
      if (found.status === "succeeded" || found.status === "processing") {
        return {
          payment_sessions: [
            { provider_id: "stripe", data: { client_secret: found.client_secret } },
          ],
        }
      }
      intent =
        found.amount === cart.total
          ? found
          : await stripe.paymentIntents.update(found.id, { amount: cart.total })
    } catch {
      // Intent vanished (test-mode key swap, expired). Fall through and make one.
      intent = null
    }
  }

  if (!intent) {
    intent = await stripe.paymentIntents.create({
      amount: cart.total,
      currency: "usd",
      receipt_email: cart.email,
      metadata: { cart_id: cart.id },
      automatic_payment_methods: { enabled: true },
    })
  }

  const orderFields = {
    cart_id: cart.id,
    user_id: user?.id ?? null,
    email: cart.email,
    shipping_address: cart.shipping_address,
    subtotal_cents: cart.subtotal,
    shipping_cents: cart.shipping_total,
    total_cents: cart.total,
    status: "pending" as const,
    payment_provider: "stripe" as const,
    payment_reference: intent.id,
    updated_at: new Date().toISOString(),
  }

  let orderId: string
  if (existing) {
    const { data, error } = await supabase
      .from("orders")
      .update(orderFields)
      .eq("id", existing.id)
      .select("id")
      .single()
    if (error) throw new Error(`Could not update order: ${error.message}`)
    orderId = data.id

    // Rewrite the lines so a cart edited between steps is reflected.
    await supabase.from("order_items").delete().eq("order_id", orderId)
  } else {
    const { data, error } = await supabase
      .from("orders")
      .insert(orderFields)
      .select("id")
      .single()
    if (error) throw new Error(`Could not create order: ${error.message}`)
    orderId = data.id
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    cart.items.map((i) => ({
      order_id: orderId,
      variant_id: i.variant.id,
      product_title: i.variant.product.title,
      variant_title: i.variant.title,
      quantity: i.quantity,
      unit_price_cents: i.unit_price,
    }))
  )
  if (itemsError) throw new Error(`Could not save order items: ${itemsError.message}`)

  return {
    order_id: orderId,
    payment_sessions: [
      { provider_id: "stripe", data: { client_secret: intent.client_secret } },
    ],
  }
}

// ─── Order completion ─────────────────────────────────────────────────────────

/**
 * Closes out the browser's side of checkout: retires the cart and clears the
 * cookie. It deliberately has NO authority over payment state.
 *
 * Marking an order paid happens only in the Stripe webhook, which is signed and
 * retried. This runs in the user's browser, so it can be skipped (dropped
 * connection, closed tab) or forged — neither may affect whether we believe a
 * customer paid.
 */
export async function finalizeCheckout(cartId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id,display_id,status")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  await supabase
    .from("carts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", cartId)

  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE)

  if (!order) return { type: "unknown" as const }

  revalidatePath("/checkout/success")
  return {
    type: "order" as const,
    order: { id: order.id, display_id: order.display_id, status: order.status },
  }
}

/**
 * Polled by the success page while it waits for the webhook to land. Returns
 * only the payment status — never grants anything.
 */
export async function getOrderPaymentStatus(orderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("id,display_id,status")
    .eq("id", orderId)
    .maybeSingle()

  if (!data) return { status: "unknown" as const }
  return { status: data.status as string, displayId: data.display_id }
}
