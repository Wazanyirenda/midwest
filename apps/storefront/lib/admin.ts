import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type Role = "customer" | "staff" | "admin"

/** What each role may reach. Admin is a superset of staff. */
export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  staff: "Staff — orders and inventory",
  admin: "Admin — full access",
}

/**
 * Emergency bootstrap only. If roles are misconfigured (a bad migration, a role
 * cleared by mistake) an address here still gets in, so you can never lock
 * yourself out of your own store. Day-to-day access comes from profiles.role —
 * leave this unset in normal operation.
 */
function bootstrapEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Deduped per request — the layout, page, and any action all reuse one lookup. */
export const getRole = cache(async (): Promise<Role | null> => {
  const user = await getUser()
  if (!user) return null

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const role = (data?.role as Role | undefined) ?? "customer"

  // Bootstrap override never *reduces* access, only grants it.
  if (role !== "admin" && user.email) {
    if (bootstrapEmails().includes(user.email.toLowerCase())) return "admin"
  }

  return role
})

export async function isAdmin(): Promise<boolean> {
  return (await getRole()) === "admin"
}

/** Staff or admin — the bar for reaching the admin area at all. */
export async function isStaff(): Promise<boolean> {
  const role = await getRole()
  return role === "staff" || role === "admin"
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Not authorized")
}

export async function requireStaff(): Promise<void> {
  if (!(await isStaff())) throw new Error("Not authorized")
}

/** For pages/layouts: bounce rather than throw. */
export async function requireStaffOrRedirect(): Promise<Role> {
  const role = await getRole()
  if (role !== "staff" && role !== "admin") redirect("/")
  return role
}

/** For admin-only pages inside the admin area (settings, products, roles). */
export async function requireAdminOrRedirect(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin")
}
