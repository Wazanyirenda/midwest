"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getUser, requireUser } from "@/lib/auth"
import { requireAdmin } from "@/lib/admin"
import { rateLimit } from "@/lib/rate-limit"
import { getSiteSettings } from "@/lib/settings"
import { isNetwork, isValidTxid, type Asset } from "@/lib/crypto-assets"
import { paymentOptions, quoteAmount, quoteExpired } from "@/lib/manual-payments"
import { queueOrderLabel } from "@/lib/print"
import {
  sendOrderCanceledEmail,
  sendOrderConfirmationEmail,
  sendPaidReceiptCopy,
  sendPaymentSubmittedAlert,
  type ManualEmailOrder,
} from "@/lib/email"

type Result = { error?: string }

const orderIdSchema = z.string().uuid()

// Everything the emails and receipt need, in one read.
const EMAIL_ORDER_FIELDS =
  "id,order_code,email,status,created_at,payment_provider,subtotal_cents,shipping_cents,total_cents," +
  "shipping_address,payment_asset,payment_network,payment_address,payment_amount_crypto,payment_txid," +
  "items:order_items(product_title,variant_title,quantity,unit_price_cents)"

type EmailOrderRow = ManualEmailOrder & { payment_txid: string | null }

async function loadEmailOrder(orderId: string): Promise<EmailOrderRow | null> {
  const { data } = await supabase.from("orders").select(EMAIL_ORDER_FIELDS).eq("id", orderId).maybeSingle()
  if (!data) return null
  const row = data as unknown as EmailOrderRow
  const a = row.shipping_address
  return {
    ...row,
    customer_name: a ? `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() : null,
  }
}

function refreshOrderPages(orderId: string) {
  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account/orders")
  revalidatePath("/admin/orders")
}

// ─── Customer ─────────────────────────────────────────────────────────────────

/**
 * The customer says they've paid and gives the transaction ID. This only
 * records the claim and tells staff — it never changes payment state. A
 * transaction ID can be copied from anyone's payment; the staff check on the
 * blockchain is what makes it count.
 */
export async function submitPaymentProof(orderId: string, txid: string): Promise<Result> {
  const user = await requireUser("/account/orders")
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }

  const cleaned = typeof txid === "string" ? txid.trim().slice(0, 200) : ""
  if (!cleaned) return { error: "Paste the transaction ID from your wallet." }

  const gate = await rateLimit("paymentProof", user.id)
  if (!gate.allowed) return { error: "Too many attempts. Please wait a few minutes." }

  // Filtered by the signed-in user: an order id alone proves nothing.
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,payment_provider,payment_network,payment_txid")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!order || order.payment_provider !== "manual") return { error: "Order not found." }
  if (order.status !== "pending") return { error: "This order is no longer waiting for payment." }

  if (!isNetwork(order.payment_network) || !isValidTxid(order.payment_network, cleaned)) {
    return {
      error:
        "That doesn't look like a transaction ID for this network. Copy it from your wallet's transaction details, not the address.",
    }
  }

  if (order.payment_txid?.toLowerCase() === cleaned.toLowerCase()) return {}

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      payment_txid: cleaned,
      payment_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) {
    // The unique index on payment_txid: one payment can only pay one order.
    if (error.code === "23505") {
      return { error: "That transaction ID is already attached to another order. Contact us if you think that's wrong." }
    }
    console.error("[manual-payments] could not save transaction ID:", error.message)
    return { error: "We couldn't save that. Please try again." }
  }
  if (!updated) return { error: "This order is no longer waiting for payment." }

  after(async () => {
    const full = await loadEmailOrder(orderId)
    if (full?.payment_txid) await sendPaymentSubmittedAlert({ ...full, payment_txid: full.payment_txid })
  })

  refreshOrderPages(orderId)
  return {}
}

/**
 * A fresh BTC amount for an order whose quote has run out. Uses the wallet
 * address in settings now, so an address the owner has rotated out is never
 * shown again. Stablecoin amounts never expire.
 */
export async function refreshBtcQuote(orderId: string): Promise<Result> {
  const user = await requireUser("/account/orders")
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }

  const gate = await rateLimit("paymentLookup", orderId)
  if (!gate.allowed) return { error: "Please wait a moment and try again." }

  const { data: order } = await supabase
    .from("orders")
    .select("id,status,payment_provider,payment_asset,payment_quoted_at,payment_submitted_at,total_cents")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!order || order.payment_provider !== "manual") return { error: "Order not found." }
  if (order.status !== "pending" || order.payment_submitted_at) return {}

  const settings = await getSiteSettings()
  if (!quoteExpired(order.payment_asset, order.payment_quoted_at, settings.btcQuoteMinutes)) return {}

  const option = paymentOptions(settings).find((o) => o.asset === (order.payment_asset as Asset))
  if (!option) return { error: "Bitcoin payments aren't available right now. Contact us and we'll help." }

  let amount: number
  try {
    amount = await quoteAmount("BTC", order.total_cents)
  } catch {
    return { error: "We couldn't get a Bitcoin price right now. Try again in a minute." }
  }

  await supabase
    .from("orders")
    .update({
      payment_amount_crypto: amount,
      payment_address: option.address,
      payment_quoted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("payment_submitted_at", null)

  refreshOrderPages(orderId)
  return {}
}

// ─── Staff ────────────────────────────────────────────────────────────────────
// Approving takes money as received, so it is admin-only rather than the
// staff level the rest of the orders page allows (AGENTS.md §3).

/**
 * Marks a manual order paid after a person has checked the payment on the
 * blockchain. Goes through process_payment_success, the same exactly-once path
 * the card and BTCPay webhooks use: stock comes off once, and a double click or
 * a second admin approving at the same moment does nothing the second time.
 */
export async function approveManualPayment(orderId: string): Promise<Result> {
  await requireAdmin()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }
  const admin = await getUser()

  const { data: order } = await supabase
    .from("orders")
    .select("id,order_code,status,payment_provider,payment_reference")
    .eq("id", orderId)
    .maybeSingle()
  if (!order || order.payment_provider !== "manual") return { error: "Order not found." }
  if (order.status !== "pending") return { error: "This order isn't waiting for payment any more." }

  // Normally set when the order was placed. Backfilled so an order whose
  // second write failed can still be approved.
  const reference = order.payment_reference ?? order.order_code
  if (!order.payment_reference) {
    await supabase.from("orders").update({ payment_reference: reference }).eq("id", orderId)
  }

  const { data, error } = await supabase.rpc("process_payment_success", {
    p_provider: "manual",
    p_event_id: `${orderId}:approved`,
    p_event_type: "ManualApproval",
    p_payment_reference: reference,
  })
  if (error) {
    console.error("[manual-payments] approval failed:", error.message)
    return { error: "Couldn't approve this order. Please try again." }
  }

  const result = data as { status?: string } | null
  if (result?.status !== "processed") {
    refreshOrderPages(orderId)
    return result?.status === "duplicate" ? {} : { error: "This order isn't waiting for payment any more." }
  }

  await supabase
    .from("orders")
    .update({ approved_at: new Date().toISOString(), approved_by: admin?.id ?? null })
    .eq("id", orderId)

  after(async () => {
    await queueOrderLabel(orderId)
    const full = await loadEmailOrder(orderId)
    if (!full) return
    await sendOrderConfirmationEmail(full)
    await sendPaidReceiptCopy(full)
  })

  refreshOrderPages(orderId)
  return {}
}

/** Cancels a manual order whose payment couldn't be verified. */
export async function rejectManualOrder(orderId: string, reason: string): Promise<Result> {
  await requireAdmin()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }
  const note = typeof reason === "string" ? reason.trim().slice(0, 300) : ""

  const { data: order } = await supabase
    .from("orders")
    .update({
      status: "canceled",
      cancel_reason: note || "Payment could not be verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_provider", "manual")
    .eq("status", "pending")
    .select("id,order_code,email")
    .maybeSingle()
  if (!order) return { error: "This order isn't waiting for payment any more." }

  after(() => sendOrderCanceledEmail({ ...order, kind: "rejected", reason: note || null }))

  refreshOrderPages(orderId)
  return {}
}
