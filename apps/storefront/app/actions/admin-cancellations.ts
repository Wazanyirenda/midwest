"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import { sendCancellationDecisionEmail } from "@/lib/email"

type Result = { error?: string }

const orderIdSchema = z.string().uuid()

// Admin-only, like status changes: approving can mean a refund is owed.

function refresh(orderId: string) {
  revalidatePath("/admin/orders")
  revalidatePath("/admin")
  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account/orders")
}

/**
 * Puts a canceled order's units back on the shelf. Only for an order that was
 * paid — stock is taken at payment, so an unpaid order never held any.
 * Follows adjustInventory's read-then-write, logged as a restock.
 */
async function restock(orderId: string, orderCode: string) {
  const { data: items } = await supabase
    .from("order_items")
    .select("variant_id,quantity")
    .eq("order_id", orderId)
    .not("variant_id", "is", null)
  const admin = await getUser()

  for (const item of items ?? []) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id,inventory_quantity")
      .eq("id", item.variant_id as string)
      .maybeSingle()
    if (!variant) continue
    const next = variant.inventory_quantity + item.quantity
    const { error } = await supabase
      .from("product_variants")
      .update({ inventory_quantity: next })
      .eq("id", variant.id)
    if (error) {
      console.error("[cancellations] restock failed:", error.message)
      continue
    }
    await supabase
      .from("inventory_adjustments")
      .insert({
        variant_id: variant.id,
        delta: item.quantity,
        resulting_quantity: next,
        reason: "restock",
        note: `Order ${orderCode} canceled`,
        actor_email: admin?.email ?? null,
      })
      .then(undefined, () => {})
  }
}

/** Cancels the order the customer asked to cancel, and tells them. */
export async function approveCancellation(orderId: string): Promise<Result> {
  await requireAdmin()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }

  const { data: before } = await supabase
    .from("orders")
    .select("id,status,cancellation_requested_at")
    .eq("id", orderId)
    .maybeSingle()
  if (!before?.cancellation_requested_at) return { error: "There's no cancellation request on this order." }
  if (!["pending", "paid"].includes(before.status)) {
    return { error: "This order has already moved on and can't be canceled here." }
  }

  // Conditional on the status read above, so two admins acting at once can't
  // both cancel — and only one of them restocks.
  const { data: order } = await supabase
    .from("orders")
    .update({
      status: "canceled",
      cancel_reason: "Canceled at the customer's request",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", before.status)
    .select("id,order_code,email,payment_provider")
    .maybeSingle()
  if (!order) return { error: "This order changed while you were looking at it. Refresh and try again." }

  const wasPaid = before.status === "paid"
  if (wasPaid) await restock(order.id, order.order_code)

  after(() =>
    sendCancellationDecisionEmail({
      id: order.id,
      order_code: order.order_code,
      email: order.email,
      approved: true,
      wasPaid,
      crypto: order.payment_provider === "manual" || order.payment_provider === "btcpay",
    })
  )

  refresh(orderId)
  return {}
}

/** Keeps the order going and tells the customer why it couldn't be canceled. */
export async function declineCancellation(orderId: string, reason: string): Promise<Result> {
  await requireAdmin()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }
  const note = typeof reason === "string" ? reason.trim().slice(0, 300) : ""

  const { data: order } = await supabase
    .from("orders")
    .update({ cancellation_requested_at: null, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .not("cancellation_requested_at", "is", null)
    .select("id,order_code,email")
    .maybeSingle()
  if (!order) return { error: "There's no cancellation request on this order." }

  after(() =>
    sendCancellationDecisionEmail({
      id: order.id,
      order_code: order.order_code,
      email: order.email,
      approved: false,
      reason: note || null,
    })
  )

  refresh(orderId)
  return {}
}
