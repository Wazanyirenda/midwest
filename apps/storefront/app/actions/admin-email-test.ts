"use server"

import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import { deliver, verifyTransport, transportStatus } from "@/lib/email-transport"

type Result = { error?: string; message?: string }

/**
 * Proves the configured mail credentials work, end to end, to the admin's own
 * address. Deliberately transactional and self-addressed: it can't be used to
 * mail a customer, so it needs no consent check.
 */
export async function sendTestEmail(): Promise<Result> {
  await requireAdmin()

  const status = transportStatus()
  if (!status.ready) {
    return { error: `No email transport configured (${status.detail}).` }
  }

  const user = await getUser()
  if (!user?.email) return { error: "Your account has no email address." }

  // Check the credentials before sending, so a bad password reports as such
  // instead of as a silent failure.
  const check = await verifyTransport()
  if (!check.ok) {
    console.error("[email-test] transport verify failed:", check.error)
    return { error: `Could not connect: ${check.error}` }
  }

  const result = await deliver({
    from:
      process.env.EMAIL_FROM ??
      process.env.RESEND_FROM ??
      "Midwestern Peptides <orders@midwesternpeptides.com>",
    to: user.email,
    subject: "Test email from your store",
    html: `<p style="font-family:Arial,sans-serif;font-size:14px;color:#514e48;">
      Your email settings are working. This was sent via <strong>${status.detail}</strong>.
    </p>`,
  })

  if (!result.ok) {
    console.error("[email-test] send failed:", result.error)
    return { error: `Send failed: ${result.error}` }
  }

  return { message: `Sent to ${user.email} via ${status.detail}.` }
}
