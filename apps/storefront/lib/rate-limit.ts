import "server-only"
import { headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Named limits, so thresholds live in one place rather than scattered across
 * call sites. Tuned to be invisible to a real person and obstructive to a script.
 */
export const LIMITS = {
  signIn: { limit: 8, windowSeconds: 300 },
  signUp: { limit: 4, windowSeconds: 3600 },
  passwordReset: { limit: 4, windowSeconds: 3600 },
  newsletter: { limit: 5, windowSeconds: 3600 },
  payment: { limit: 15, windowSeconds: 600 },
  testEmail: { limit: 5, windowSeconds: 3600 },
  campaignSend: { limit: 3, windowSeconds: 3600 },
  // Guessable tokens — a shared wishlist link is short and public.
  tokenLookup: { limit: 30, windowSeconds: 600 },
} as const

export type LimitName = keyof typeof LIMITS

export type RateLimitResult = {
  allowed: boolean
  retryAfter: number
}

/**
 * Best-effort client IP. Behind Vercel the left-most x-forwarded-for entry is
 * the real client; the header is spoofable in general, which is why IP is only
 * ever half of a bucket key — the other half is the email or user id.
 */
async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return h.get("x-real-ip") ?? "unknown"
}

/**
 * Consumes one unit against `name` for `identifier`.
 *
 * Fails OPEN: if the limiter itself errors, the request proceeds. A database
 * hiccup must not lock customers out of signing in or paying. That is the right
 * trade for abuse control, and the opposite of the choice made for payment
 * webhooks and email consent, which fail closed.
 */
export async function rateLimit(
  name: LimitName,
  identifier?: string
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = LIMITS[name]
  const who = identifier?.toLowerCase().trim() || (await clientIp())
  const bucket = `${name}:${who}`

  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error("[rate-limit] check failed, allowing:", error.message)
      return { allowed: true, retryAfter: 0 }
    }

    const result = data as { allowed: boolean; retry_after: number }
    return { allowed: result.allowed, retryAfter: result.retry_after ?? 0 }
  } catch (e) {
    console.error("[rate-limit] check threw, allowing:", e)
    return { allowed: true, retryAfter: 0 }
  }
}

/** Wording that doesn't reveal the threshold or whether the account exists. */
export function rateLimitMessage(retryAfter: number): string {
  const minutes = Math.ceil(retryAfter / 60)
  return minutes > 1
    ? `Too many attempts. Try again in about ${minutes} minutes.`
    : "Too many attempts. Try again in a minute."
}
