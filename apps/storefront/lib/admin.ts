import "server-only"
import { currentUser } from "@clerk/nextjs/server"

// Comma-separated allowlist, e.g. ADMIN_EMAILS=owner@example.com,ops@example.com
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  // TEMPORARY: admin auth disabled for local dashboard access.
  // Restore the check below before deploying anywhere reachable by others.
  return true
  /*
  const user = await currentUser()
  if (!user) return false

  const allowed = adminEmails()
  // Local development convenience: with no allowlist configured, any signed-in
  // user is an admin. In production an empty allowlist denies everyone.
  if (allowed.length === 0) return process.env.NODE_ENV === "development"

  return user.emailAddresses.some((e) =>
    allowed.includes(e.emailAddress.toLowerCase())
  )
  */
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Not authorized")
  }
}
