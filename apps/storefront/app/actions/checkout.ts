"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { after } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getCart, getCartById, CART_COOKIE } from "@/lib/cart"
import { getShippingOptions } from "@/lib/shipping"
import { getUser } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { getSiteSettings } from "@/lib/settings"
import { createInvoice, isConfigured as isCryptoConfigured } from "@/lib/btcpay"
import { syncOrder } from "@/lib/btcpay-sync"
import { paymentOptions, quoteAmount } from "@/lib/manual-payments"
import { ASSETS, type Asset } from "@/lib/crypto-assets"
import { sendNewOrderAlert, sendOrderReceivedEmail } from "@/lib/email"
import type { ReceiptOrder } from "@/lib/receipt-pdf"
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

// ─── Payment ─────────────────────────────────────────────────────────────────

/**
 * What the buyer confirmed at checkout. Both are legal preconditions for the
 * sale, so they are arguments to the mutation rather than UI state: a checkbox
 * the server never sees enforces nothing.
 */
export type CheckoutAttestation = {
  /** 21+ confirmation. Required — this catalogue is age-restricted. */
  ageConfirmed: boolean
  /** Terms, privacy policy and research-use disclaimer. */
  termsAccepted: boolean
}

/** Stamped onto the order so the attestation is auditable after the fact. */
function attestationTimestamps(attestation: CheckoutAttestation) {
  if (attestation?.ageConfirmed !== true) {
    throw new Error("You must confirm you are 21 or older to place this order.")
  }
  if (attestation?.termsAccepted !== true) {
    throw new Error("You must accept the terms and research-use disclaimer to place this order.")
  }
  const now = new Date().toISOString()
  return { age_confirmed_at: now, terms_accepted_at: now }
}

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
  providerId: "stripe" | "btcpay",
  attestation: CheckoutAttestation
) {
  // Checked before anything else: an order that cannot lawfully be placed must
  // not consume a rate-limit slot or reach a payment provider.
  const attested = attestationTimestamps(attestation)

  // Payment attempts are limited per cart: card testing works by hammering
  // intent creation, and each attempt costs a Stripe API call.
  const gate = await rateLimit("payment", cartId)
  if (!gate.allowed) {
    throw new Error("Too many payment attempts. Please wait a moment.")
  }

  const cart = await getCartById(cartId)
  if (!cart) throw new Error("Cart not found")
  if (!cart.email) throw new Error("Cart is missing contact information")
  if (cart.items.length === 0) throw new Error("Cart is empty")

  const settings = await getSiteSettings()
  const user = await getUser()

  if (providerId === "btcpay") {
    if (!settings.cryptoPaymentsEnabled || !isCryptoConfigured()) {
      throw new Error("Crypto payments are not available right now.")
    }
    return createCryptoSession(cart, user?.id ?? null, attested, settings.cryptoTolerancePercent)
  }

  // Card is gated by a setting rather than by code so it can be switched on the
  // moment a processor that permits this category is live — but never by
  // accident. See lib/settings.ts for why the default is off.
  if (!settings.cardPaymentsEnabled) {
    throw new Error("Card payments are not available right now.")
  }

  const stripe = getStripe()

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
    ...attested,
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
    .select("id,order_code,status")
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
    order: { id: order.id, order_code: order.order_code, status: order.status },
  }
}

/**
 * Polled by the success page while it waits for the webhook to land. Returns
 * only the payment status — never grants anything.
 */
export async function getOrderPaymentStatus(orderId: string) {
  const read = () =>
    supabase.from("orders").select("id,order_code,status,payment_provider").eq("id", orderId).maybeSingle()

  let { data } = await read()
  if (!data) return { status: "unknown" as const }

  // A crypto order still pending here may already be paid with its webhook
  // lost — the site was down, or the delivery failed. Ask BTCPay directly; it
  // goes through the same exactly-once path the webhook uses. This is a
  // server-side provider lookup, never the browser's word for it.
  if (data.status === "pending" && data.payment_provider === "btcpay") {
    const gate = await rateLimit("paymentLookup", orderId)
    if (gate.allowed) {
      try {
        if ((await syncOrder(orderId)) !== "unchanged") data = (await read()).data ?? data
      } catch (e) {
        // BTCPay unreachable: report what we know and let the next poll retry.
        console.error("[checkout] BTCPay status check failed:", e)
      }
    }
  }

  return { status: data.status as string, orderCode: data.order_code }
}

/**
 * Crypto session: create the order first (pending), then the invoice, then
 * store its id as the payment reference.
 *
 * Order-before-invoice is deliberate — the webhook raises (returning 500 for a
 * retry) if no order matches the invoice, so an order must exist before there
 * is anything to pay. The reference is stored before the browser is sent to
 * the checkout page, so no payment can precede it.
 */
async function createCryptoSession(
  cart: Awaited<ReturnType<typeof getCartById>>,
  userId: string | null,
  attested: { age_confirmed_at: string; terms_accepted_at: string },
  tolerancePercent: number
) {
  if (!cart) throw new Error("Cart not found")

  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const orderFields = {
    cart_id: cart.id,
    user_id: userId,
    email: cart.email,
    shipping_address: cart.shipping_address,
    subtotal_cents: cart.subtotal,
    shipping_cents: cart.shipping_total,
    total_cents: cart.total,
    status: "pending" as const,
    payment_provider: "btcpay" as const,
    ...attested,
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  // Amount comes from the server-side cart total, never from the client.
  const invoice = await createInvoice({
    orderId,
    amountCents: cart.total,
    redirectUrl: `${appUrl}/checkout/success?order_id=${orderId}`,
    tolerancePercent,
  })

  // BTCPay's webhook names the invoice id, so it is the payment reference from
  // the start — a fresh invoice for a retried checkout replaces the old one.
  const { error } = await supabase
    .from("orders")
    .update({ payment_reference: invoice.id })
    .eq("id", orderId)
  if (error) throw new Error(`Could not save invoice reference: ${error.message}`)

  return {
    order_id: orderId,
    payment_sessions: [
      { provider_id: "btcpay", data: { checkout_url: invoice.checkoutLink } },
    ],
  }
}

// ─── Manual crypto ────────────────────────────────────────────────────────────

/** Orders this recent for the same cart are a double-click, not a new order. */
const DUPLICATE_ORDER_WINDOW_MS = 10 * 60 * 1000

/**
 * Places an order to be paid by hand in BTC, USDT or USDC.
 *
 * The order is created pending and the cart retired: the customer pays from
 * their own wallet afterwards, using the address and amount on their order
 * page. Nothing here or in the browser can mark it paid — only a staff member
 * approving it in /admin/orders (approveManualPayment) can.
 *
 * Prices, totals and the coin amount all come from the server; the browser
 * only says which coin it wants.
 */
export async function placeManualOrder(
  cartId: string,
  asset: Asset,
  attestation: CheckoutAttestation
): Promise<{ orderId?: string; error?: string }> {
  let attested: { age_confirmed_at: string; terms_accepted_at: string }
  try {
    attested = attestationTimestamps(attestation)
  } catch (e) {
    return { error: (e as Error).message }
  }

  const user = await getUser()
  if (!user) return { error: "Please sign in to place your order." }
  if (!ASSETS.includes(asset)) return { error: "Choose how you'd like to pay." }

  const gate = await rateLimit("payment", cartId)
  if (!gate.allowed) return { error: "Too many attempts. Please wait a moment." }

  // The cookie's cart, checked against its owner — never a cart picked by id
  // from the browser.
  const cart = await getCart()
  if (!cart || cart.id !== cartId) return { error: "Your cart has changed. Please refresh the page." }
  if (!cart.email) return { error: "Add your contact details first." }
  if (cart.items.length === 0) return { error: "Your cart is empty." }

  const short = cart.items.find((i) => i.quantity > i.variant.inventory_quantity)
  if (short) {
    return { error: `Only ${short.variant.inventory_quantity} of ${short.variant.product.title} left. Please update your cart.` }
  }

  const option = paymentOptions(await getSiteSettings()).find((o) => o.asset === asset)
  if (!option) return { error: "That payment method isn't available right now." }

  const { data: recent } = await supabase
    .from("orders")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("user_id", user.id)
    .eq("payment_provider", "manual")
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - DUPLICATE_ORDER_WINDOW_MS).toISOString())
    .limit(1)
    .maybeSingle()
  if (recent) return { orderId: recent.id }

  let amount: number
  try {
    amount = await quoteAmount(asset, cart.total)
  } catch {
    return {
      error: "We couldn't get a Bitcoin price right now. Try again in a minute, or pay with USDT or USDC.",
    }
  }

  const now = new Date().toISOString()
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      cart_id: cart.id,
      user_id: user.id,
      email: cart.email,
      shipping_address: cart.shipping_address,
      subtotal_cents: cart.subtotal,
      shipping_cents: cart.shipping_total,
      total_cents: cart.total,
      status: "pending",
      payment_provider: "manual",
      payment_asset: option.asset,
      payment_network: option.network,
      payment_address: option.address,
      payment_amount_crypto: amount,
      payment_quoted_at: now,
      ...attested,
      updated_at: now,
    })
    .select("id,order_code")
    .single()
  if (error || !order) {
    console.error("[checkout] could not create manual order:", error?.message)
    return { error: "We couldn't place your order. Please try again." }
  }

  // The order code doubles as the payment reference, which is how approval
  // finds the order through process_payment_success.
  const { error: refError } = await supabase
    .from("orders")
    .update({ payment_reference: order.order_code })
    .eq("id", order.id)

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
  if (refError || itemsError) {
    // An order without its lines can't be fulfilled or approved; remove it so
    // the customer can simply try again.
    console.error("[checkout] could not complete manual order:", refError?.message ?? itemsError?.message)
    await supabase.from("orders").delete().eq("id", order.id)
    return { error: "We couldn't place your order. Please try again." }
  }

  await supabase.from("carts").update({ completed_at: now }).eq("id", cart.id)
  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE)

  const address = cart.shipping_address
  const emailOrder = {
    id: order.id,
    order_code: order.order_code as string,
    email: cart.email,
    customer_name: address ? `${address.first_name ?? ""} ${address.last_name ?? ""}`.trim() : null,
    shipping_address: address as ReceiptOrder["shippingAddress"],
    items: cart.items.map((i) => ({
      product_title: i.variant.product.title,
      variant_title: i.variant.title,
      quantity: i.quantity,
      unit_price_cents: i.unit_price,
    })),
    subtotal_cents: cart.subtotal,
    shipping_cents: cart.shipping_total,
    total_cents: cart.total,
    payment_asset: option.asset,
    payment_network: option.network,
    payment_address: option.address,
    payment_amount_crypto: amount,
  }
  // After the response, so slow mail never holds up the customer. Neither send
  // can throw: failures are logged in email_log.
  after(async () => {
    await sendOrderReceivedEmail(emailOrder)
    await sendNewOrderAlert(emailOrder)
  })

  revalidatePath("/", "layout")
  return { orderId: order.id }
}
