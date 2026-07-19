import "server-only"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"

// Comma-separated allowlist, e.g. ADMIN_EMAILS=owner@example.com,ops@example.com
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const user = await getUser()
  if (!user?.email) return false

  const allowed = adminEmails()
  // Local development convenience: with no allowlist configured, any signed-in
  // user is an admin. In production an empty allowlist denies everyone.
  if (allowed.length === 0) return process.env.NODE_ENV === "development"

  return allowed.includes(user.email.toLowerCase())
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Not authorized")
  }
}

// For pages/layouts: bounce non-admins to the homepage instead of throwing.
export async function requireAdminOrRedirect(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/")
  }
}
