import "server-only"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createAuthClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  marketing_email_opt_in: boolean
}

// Validates the JWT against the auth server — never use getSession() for
// authorization decisions.
export async function getUser(): Promise<User | null> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function requireUser(next?: string): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in")
  }
  return user
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,first_name,last_name,phone,avatar_url,marketing_email_opt_in")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    console.error("Could not load profile:", error.message)
    return null
  }
  return data as Profile | null
}
