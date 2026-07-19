import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { createAuthClient } from "@/lib/supabase/server"
import { mergeCartOnSignIn } from "@/lib/cart-merge"

// OAuth landing point (Google). Supabase redirects here with ?code=...,
// which we exchange for a session using the PKCE verifier cookie set when
// the flow started.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next")
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/account"

  // The user declined consent, or the provider returned an error.
  if (searchParams.get("error") || !code) {
    redirect("/auth/error")
  }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirect("/auth/error")
  }

  if (data.user) {
    await mergeCartOnSignIn(data.user.id)
  }

  redirect(next)
}
