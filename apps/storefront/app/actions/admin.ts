"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/admin"

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

  revalidatePath("/admin/orders")
}
