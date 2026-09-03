"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit"

// Inline-feedback action: returns a result instead of throwing.
export async function subscribeToNewsletter(
  email: string
): Promise<{ ok: boolean; message: string }> {
  // Limited by IP: this writes a row from an unauthenticated form, so it's an
  // easy target for scripted junk signups.
  const gate = await rateLimit("newsletter")
  if (!gate.allowed) {
    return { ok: false, message: rateLimitMessage(gate.retryAfter) }
  }

  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, message: "Please enter a valid email address." }
  }

  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .upsert({ email: normalized }, { onConflict: "email", ignoreDuplicates: true })

  if (error) {
    console.error("subscribeToNewsletter:", error.message)
    return { ok: false, message: "Something went wrong — please try again." }
  }

  return { ok: true, message: "You're on the list." }
}
