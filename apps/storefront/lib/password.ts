import { z } from "zod"

// Shared by the auth forms (client) and the auth actions (server), so
// deliberately not a server-only module.

export const PASSWORD_MIN = 10

/**
 * Supabase's own floor is 6 characters with no composition rules, so this is
 * the only thing standing between the store and a password of "password".
 * Applied on both sides on purpose: the form schema for immediate feedback,
 * the server action because a check in the browser is not a control.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")

/** Returns the first failing rule, or null when the password is acceptable. */
export function checkPassword(value: string): string | null {
  const result = passwordSchema.safeParse(value)
  return result.success ? null : result.error.issues[0]?.message ?? "Password is too weak."
}
