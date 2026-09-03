"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"

type Result = { error?: string }

const entrySchema = z.object({
  question: z.string().trim().min(1, "Question is required.").max(300),
  answer: z.string().trim().min(1, "Answer is required.").max(4000),
})

const idSchema = z.string().uuid()

/** Refresh both the public page and the editor after any change. */
function revalidateFaq() {
  revalidatePath("/faq")
  revalidatePath("/admin/faq")
  revalidatePath("/", "layout")
}

export async function createFaqItem(formData: FormData): Promise<Result> {
  await requireAdmin()

  const parsed = entrySchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the entry." }
  }

  // Append to the end rather than trusting a client-supplied position.
  const { data: last } = await supabase
    .from("faq_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from("faq_items").insert({
    ...parsed.data,
    position: (last?.position ?? -1) + 1,
  })
  if (error) {
    console.error("[faq] insert failed:", error.message)
    return { error: "Could not save the entry." }
  }

  revalidateFaq()
  return {}
}

export async function updateFaqItem(id: string, formData: FormData): Promise<Result> {
  await requireAdmin()

  if (!idSchema.safeParse(id).success) return { error: "Unknown entry." }

  const parsed = entrySchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the entry." }
  }

  const { error } = await supabase
    .from("faq_items")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("[faq] update failed:", error.message)
    return { error: "Could not save the entry." }
  }

  revalidateFaq()
  return {}
}

export async function setFaqItemPublished(
  id: string,
  published: boolean
): Promise<Result> {
  await requireAdmin()

  if (!idSchema.safeParse(id).success) return { error: "Unknown entry." }
  if (typeof published !== "boolean") return { error: "Invalid value." }

  const { error } = await supabase
    .from("faq_items")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("[faq] publish toggle failed:", error.message)
    return { error: "Could not update the entry." }
  }

  revalidateFaq()
  return {}
}

export async function deleteFaqItem(id: string): Promise<Result> {
  await requireAdmin()

  if (!idSchema.safeParse(id).success) return { error: "Unknown entry." }

  const { error } = await supabase.from("faq_items").delete().eq("id", id)
  if (error) {
    console.error("[faq] delete failed:", error.message)
    return { error: "Could not delete the entry." }
  }

  revalidateFaq()
  return {}
}

/**
 * Reorder by swapping two entries' positions. The ids are checked against the
 * table rather than trusted, so a forged pair can't write arbitrary rows.
 */
export async function swapFaqItems(aId: string, bId: string): Promise<Result> {
  await requireAdmin()

  if (!idSchema.safeParse(aId).success || !idSchema.safeParse(bId).success) {
    return { error: "Unknown entry." }
  }

  const { data: rows, error: readError } = await supabase
    .from("faq_items")
    .select("id,position")
    .in("id", [aId, bId])
  if (readError || !rows || rows.length !== 2) {
    return { error: "Could not reorder." }
  }

  const a = rows.find((r) => r.id === aId)
  const b = rows.find((r) => r.id === bId)
  if (!a || !b) return { error: "Could not reorder." }

  const updates = await Promise.all([
    supabase.from("faq_items").update({ position: b.position }).eq("id", a.id),
    supabase.from("faq_items").update({ position: a.position }).eq("id", b.id),
  ])
  if (updates.some((u) => u.error)) return { error: "Could not reorder." }

  revalidateFaq()
  return {}
}
