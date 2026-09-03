import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { deliver } from "@/lib/email-transport"
import { renderAuthEmail, type AuthEmailAction } from "@/lib/email-auth"

// Supabase's Send Email hook. Registered in the dashboard under
// Authentication → Hooks, which makes Supabase POST here instead of sending its
// own generic template — so confirmation and reset mail carries the store's
// branding and leaves from the store's own address.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type HookPayload = {
  user: { email?: string }
  email_data: {
    token_hash: string
    email_action_type: string
    redirect_to?: string
    site_url?: string
  }
}

/**
 * Standard Webhooks verification (the format Supabase uses here).
 *
 * The signature covers `{id}.{timestamp}.{rawBody}`, so the body must be read
 * as text — parsing it first re-serialises and breaks the check, exactly as
 * with the Stripe webhook.
 */
function verify(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: string,
  header: string
): boolean {
  // Supabase presents the secret as `v1,whsec_<base64>`; the signing key is the
  // decoded base64 that follows the prefix.
  const base64Key = secret.replace(/^v1,\s*/, "").replace(/^whsec_/, "")
  const key = Buffer.from(base64Key, "base64")

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64")

  // The header carries one or more space-delimited `v1,<sig>` entries.
  for (const entry of header.split(" ")) {
    const sig = entry.split(",")[1]
    if (!sig) continue
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!secret) {
    console.error("[auth-email] SEND_EMAIL_HOOK_SECRET not set")
    // Config fault, not a bad request — 500 so Supabase surfaces it rather than
    // silently falling back to no mail at all.
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  const id = request.headers.get("webhook-id")
  const timestamp = request.headers.get("webhook-timestamp")
  const signature = request.headers.get("webhook-signature")
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "missing signature headers" }, { status: 400 })
  }

  const rawBody = await request.text()
  if (!verify(secret, id, timestamp, rawBody, signature)) {
    console.warn("[auth-email] signature verification failed")
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  let payload: HookPayload
  try {
    payload = JSON.parse(rawBody) as HookPayload
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const to = payload.user?.email
  const data = payload.email_data
  if (!to || !data?.token_hash) {
    return NextResponse.json({ error: "incomplete payload" }, { status: 400 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? data.site_url ?? "http://localhost:3000"

  // Only same-origin relative paths — redirect_to arrives from the auth flow and
  // is treated as hostile (AGENTS.md §3).
  const rawNext = data.redirect_to ?? ""
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : ""

  const action = data.email_action_type as AuthEmailAction
  const confirmUrl =
    `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(data.token_hash)}` +
    `&type=${encodeURIComponent(action)}` +
    (next ? `&next=${encodeURIComponent(next)}` : "")

  const { subject, html } = renderAuthEmail(action, confirmUrl)

  const result = await deliver({
    from:
      process.env.EMAIL_FROM ??
      process.env.RESEND_FROM ??
      "Midwestern Peptides <orders@midwesternpeptides.com>",
    to,
    subject,
    html,
  })

  if (!result.ok) {
    // 500 tells Supabase the mail did not go out, rather than reporting success
    // for a message the customer never received.
    console.error("[auth-email] send failed:", result.error)
    return NextResponse.json({ error: "send failed" }, { status: 500 })
  }

  return NextResponse.json({})
}
