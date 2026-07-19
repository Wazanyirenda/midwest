"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOrderById } from "@/lib/orders"
import { getOrCreateCartId } from "./cart"

// Re-adds a past order's items to the current cart. Items whose variant is
// gone, unpublished, or out of stock are skipped and reported.
export async function reorder(
  orderId: string
): Promise<{ added: number; skipped: string[] }> {
  const user = await requireUser()
  const order = await getOrderById(orderId, user)
  if (!order) throw new Error("Order not found")

  const cartId = await getOrCreateCartId()
  let added = 0
  const skipped: string[] = []

  for (const item of order.items) {
    if (!item.variant_id) {
      skipped.push(item.title)
      continue
    }

    const { data: variant } = await supabaseAdmin
      .from("product_variants")
      .select("id,inventory_quantity,product:products(status)")
      .eq("id", item.variant_id)
      .maybeSingle()

    const productStatus = (variant?.product as { status?: string } | null)?.status
    if (!variant || productStatus !== "published" || variant.inventory_quantity <= 0) {
      skipped.push(item.title)
      continue
    }

    const quantity = Math.min(item.quantity, variant.inventory_quantity)

    const { data: existing } = await supabaseAdmin
      .from("cart_items")
      .select("id,quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", item.variant_id)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from("cart_items")
        .update({ quantity: existing.quantity + quantity })
        .eq("id", existing.id)
    } else {
      const { error } = await supabaseAdmin
        .from("cart_items")
        .insert({ cart_id: cartId, variant_id: item.variant_id, quantity })
      if (error) {
        skipped.push(item.title)
        continue
      }
    }
    added += 1
  }

  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidatePath("/", "layout")
  return { added, skipped }
}

export async function requestCancellation(orderId: string): Promise<void> {
  const user = await requireUser()
  const order = await getOrderById(orderId, user)
  if (!order) throw new Error("Order not found")

  if (!["pending", "paid"].includes(order.db_status)) {
    throw new Error("This order can no longer be canceled — contact support.")
  }
  if (order.cancellation_requested_at) return

  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      cancellation_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
  if (error) throw new Error(`Could not request cancellation: ${error.message}`)

  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/admin/orders")
}
