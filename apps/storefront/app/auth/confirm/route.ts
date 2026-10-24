import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createAuthClient } from "@/lib/supabase/server"
import { mergeCartOnSignIn } from "@/lib/cart-merge"
import { safeNextPath } from "@/lib/safe-next"

// Lands email links (signup confirmation, password recovery, email change).
// Supabase email templates point here with token_hash + type.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(searchParams.get("next"))

  if (!tokenHash || !type) {
    redirect("/auth/error")
  }

  const supabase = await createAuthClient()
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    redirect("/auth/error")
  }

  if (data.user && type !== "recovery") {
    await mergeCartOnSignIn(data.user.id)
  }

  redirect(next)
}
