import "server-only"
import { cache } from "react"
import { createAuthClient } from "@/lib/supabase/server"

export type MfaState = {
  /** A confirmed authenticator exists on this account. */
  enrolled: boolean
  /** Enrolled, but this session has not presented a code yet. */
  needsChallenge: boolean
  factorId: string | null
  friendlyName: string | null
}

/**
 * Deduped per request: the admin layout and the security page both ask.
 *
 * `nextLevel === "aal2"` is Supabase's way of saying the account has a verified
 * factor. A session that has not cleared it sits at aal1, which is what the
 * admin gate turns away.
 */
export const getMfaState = cache(async (): Promise<MfaState> => {
  const supabase = await createAuthClient()

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const verified = (factors?.totp ?? []).find((f) => f.status === "verified")

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  return {
    enrolled: Boolean(verified),
    needsChallenge:
      Boolean(verified) && aal?.nextLevel === "aal2" && aal?.currentLevel === "aal1",
    factorId: verified?.id ?? null,
    friendlyName: verified?.friendly_name ?? null,
  }
})
