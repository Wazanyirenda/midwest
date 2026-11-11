"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/admin"

type Result = { error?: string }

// Only orders that are finished can be put away. Anything still waiting on a
// payment, a shipment or a decision stays in front of whoever runs the shop.
const ARCHIVABLE = ["canceled", "delivered", "refunded"]

const orderIdSchema = z.string().uuid()

function refresh() {
  revalidatePath("/admin/orders")
  revalidatePath("/admin")
}

export async function archiveOrder(orderId: string): Promise<Result> {
  await requireStaff()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }

  const { data } = await supabase
    .from("orders")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ARCHIVABLE)
    .is("archived_at", null)
    .select("id")
    .maybeSingle()
  if (!data) return { error: "Only canceled, delivered or refunded orders can be archived." }

  refresh()
  return {}
}

export async function unarchiveOrder(orderId: string): Promise<Result> {
  await requireStaff()
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Order not found." }

  await supabase.from("orders").update({ archived_at: null }).eq("id", orderId)
  refresh()
  return {}
}

/** Puts away every canceled order at once. */
export async function archiveAllCanceled(): Promise<Result> {
  await requireStaff()

  const { error } = await supabase
    .from("orders")
    .update({ archived_at: new Date().toISOString() })
    .eq("status", "canceled")
    .is("archived_at", null)
  if (error) {
    console.error("[archive] bulk archive failed:", error.message)
    return { error: "Couldn't archive them. Please try again." }
  }

  refresh()
  return {}
}
