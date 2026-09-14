"use server"

import { revalidatePath } from "next/cache"
import { createAuthClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/admin"

type Result = { error?: string }

export type EnrollResult =
  | { error: string }
  | { factorId: string; secret: string; qrDataUri: string | null }

/** Authenticator codes are always six digits — reject anything else early. */
function normalizeCode(raw: string): string | null {
  const code = raw.replace(/\s+/g, "")
  return /^\d{6}$/.test(code) ? code : null
}

/**
 * Supabase returns the QR as raw SVG. It goes into an <img src> as a data URI
 * rather than through dangerouslySetInnerHTML — an image can't execute script,
 * and AGENTS.md §3 bans raw HTML injection outright.
 */
function toDataUri(qr: string | undefined): string | null {
  if (!qr) return null
  if (qr.startsWith("data:")) return qr
  if (qr.trimStart().startsWith("<svg")) {
    return `data:image/svg+xml;base64,${Buffer.from(qr, "utf8").toString("base64")}`
  }
  return null
}

/** Starts TOTP enrolment. The factor stays unverified until a code is checked. */
export async function enrollTotp(): Promise<EnrollResult> {
  await requireStaff()
  const supabase = await createAuthClient()

  // Names must be unique per account, and an abandoned attempt leaves its name
  // taken — listFactors only reports verified factors, so it cannot be cleaned
  // up here. A timestamp keeps retries from colliding.
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${Date.now()}`,
  })
  if (error) return { error: error.message }

  return {
    factorId: data.id,
    secret: data.totp.secret,
    qrDataUri: toDataUri(data.totp.qr_code),
  }
}

/** Confirms enrolment. Until this succeeds the factor cannot satisfy a login. */
export async function verifyTotpEnrollment(
  factorId: string,
  rawCode: string
): Promise<Result> {
  await requireStaff()
  const code = normalizeCode(rawCode)
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." }

  const supabase = await createAuthClient()
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  // Generic on purpose: a precise message tells a guesser which half was wrong.
  if (error) return { error: "That code was not accepted. Try the next one." }

  revalidatePath("/admin/security")
  revalidatePath("/admin", "layout")
  return {}
}

/** Step-up at sign-in, for a factor that is already verified. */
export async function submitMfaChallenge(rawCode: string): Promise<Result> {
  const code = normalizeCode(rawCode)
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." }

  const supabase = await createAuthClient()
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) return { error: listError.message }

  const factor = (factors?.totp ?? []).find((f) => f.status === "verified")
  if (!factor) return { error: "No authenticator is set up for this account." }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor.id })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  })
  if (error) return { error: "That code was not accepted. Try the next one." }

  revalidatePath("/admin", "layout")
  return {}
}

/**
 * Removing a factor needs a current code, so a stolen session cannot quietly
 * strip the second factor it just got past.
 */
export async function unenrollTotp(factorId: string, rawCode: string): Promise<Result> {
  await requireStaff()
  const code = normalizeCode(rawCode)
  if (!code) return { error: "Enter a current code to confirm removal." }

  const supabase = await createAuthClient()
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError.message }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (verifyError) return { error: "That code was not accepted." }

  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: error.message }

  revalidatePath("/admin/security")
  revalidatePath("/admin", "layout")
  return {}
}
