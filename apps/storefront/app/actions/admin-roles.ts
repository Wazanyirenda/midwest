"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import type { Role } from "@/lib/admin"

type Result = { error?: string }

export async function setUserRole(userId: string, role: Role): Promise<Result> {
  await requireAdmin()

  if (!["customer", "staff", "admin"].includes(role)) {
    return { error: "Invalid role." }
  }

  const actor = await getUser()
  if (actor?.id === userId && role !== "admin") {
    return { error: "You can't remove your own admin access." }
  }

  // Never allow the last admin to be demoted — that locks everyone out of the
  // admin area with no way back in short of an env var and a redeploy.
  if (role !== "admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
    if ((count ?? 0) <= 1) {
      return { error: "This is the only admin — promote someone else first." }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
  if (error) return { error: error.message }

  revalidatePath("/admin/team")
  return {}
}
