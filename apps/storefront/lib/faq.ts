import "server-only"
import { cache } from "react"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"

export type FaqItem = {
  id: string
  question: string
  answer: string
  position: number
  published: boolean
}

const FAQ_FIELDS = "id,question,answer,position,published"

/**
 * Published entries for the public page. Deduped per request so the page and
 * its structured data don't each hit the database.
 */
export const listFaqItems = cache(async (): Promise<FaqItem[]> => {
  const { data, error } = await supabase
    .from("faq_items")
    .select(FAQ_FIELDS)
    .eq("published", true)
    .order("position", { ascending: true })

  if (error) {
    console.error("[faq] could not load entries:", error.message)
    return []
  }
  return data ?? []
})

/** Every entry, draft included. Admin screens only. */
export async function listAllFaqItems(): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from("faq_items")
    .select(FAQ_FIELDS)
    .order("position", { ascending: true })

  if (error) {
    console.error("[faq] could not load entries:", error.message)
    return []
  }
  return data ?? []
}
