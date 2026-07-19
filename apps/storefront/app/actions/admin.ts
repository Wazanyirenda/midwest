"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { sendOrderStatusEmail } from "@/lib/email"

export async function updateVariant(
  variantId: string,
  data: { price_cents?: number; inventory_quantity?: number }
) {
  await requireAdmin()

  const updates: Record<string, number> = {}
  if (data.price_cents != null && data.price_cents >= 0) {
    updates.price_cents = Math.round(data.price_cents)
  }
  if (data.inventory_quantity != null && data.inventory_quantity >= 0) {
    updates.inventory_quantity = Math.round(data.inventory_quantity)
  }
  if (!Object.keys(updates).length) return

  const { error } = await supabase
    .from("product_variants")
    .update(updates)
    .eq("id", variantId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/products")
  revalidatePath("/products")
}

export async function updateProductStatus(
  productId: string,
  status: "draft" | "published"
) {
  await requireAdmin()

  const { error } = await supabase
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", productId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/products")
  revalidatePath("/products")
}

export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "shipped" | "delivered" | "canceled"
) {
  await requireAdmin()

  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
  if (error) throw new Error(error.message)

  // Notify the customer on ship/deliver/cancel (no-op for other statuses;
  // email failures never fail the update).
  if (["shipped", "delivered", "canceled"].includes(status)) {
    const { data: order } = await supabase
      .from("orders")
      .select("id,display_id,email,status,tracking_number,tracking_carrier")
      .eq("id", orderId)
      .maybeSingle()
    if (order) {
      sendOrderStatusEmail(order).catch(() => {})
    }
  }

  revalidatePath("/admin/orders")
}

export async function updateOrderTracking(
  orderId: string,
  data: { tracking_number: string; tracking_carrier: "usps" | "ups" | "fedex" | "dhl" }
) {
  await requireAdmin()

  const trackingNumber = data.tracking_number.trim()
  if (!trackingNumber) throw new Error("Tracking number is required")

  const { error } = await supabase
    .from("orders")
    .update({
      tracking_number: trackingNumber,
      tracking_carrier: data.tracking_carrier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/orders")
}
