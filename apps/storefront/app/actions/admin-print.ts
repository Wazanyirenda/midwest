"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireStaff } from "@/lib/admin"
import { queueOrderPrint } from "@/lib/print"

type Result = { error?: string }

/**
 * Queues a shipping label or a receipt by hand — a jam, a mis-scan, or an
 * order that came in while auto-print was off. Staff, not admin: orders are
 * staff-reachable (AGENTS.md §3), and this only reprints what the shop already
 * has.
 *
 * Forced, so it ignores the auto-print settings: pressing the button is the
 * instruction.
 */
export async function reprintOrder(orderId: string, kind: "label" | "receipt"): Promise<Result> {
  await requireStaff()

  if (!z.string().uuid().safeParse(orderId).success) {
    return { error: "Invalid order." }
  }
  if (kind !== "label" && kind !== "receipt") {
    return { error: "Invalid print type." }
  }

  const result = await queueOrderPrint(orderId, kind)
  if (result.error) return result

  revalidatePath("/admin/orders")
  revalidatePath("/admin/printing")
  revalidatePath("/admin")
  return {}
}
