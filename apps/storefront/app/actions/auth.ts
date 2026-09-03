"use server"

import { cookies } from "next/headers"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createAuthClient } from "@/lib/supabase/server"
import { mergeCartOnSignIn } from "@/lib/cart-merge"
import { CART_COOKIE } from "@/lib/cart"
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit"

// Auth actions return { error } for inline form errors instead of throwing;
// redirect() is always called OUTSIDE any try/catch (it throws NEXT_REDIRECT).

type ActionResult = { error?: string; ok?: boolean; message?: string }

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export async function signIn(data: {
  email: string
  password: string
  next?: string
}): Promise<ActionResult> {
  // Keyed on the email so one attacker can't lock out a whole shared IP, and
  // one account can't be brute-forced from many IPs.
  const gate = await rateLimit("signIn", data.email)
  if (!gate.allowed) return { error: rateLimitMessage(gate.retryAfter) }

  const supabase = await createAuthClient()
  const { data: result, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Please confirm your email address first — check your inbox for the confirmation link."
          : "Invalid email or password.",
    }
  }

  await mergeCartOnSignIn(result.user.id)
  revalidatePath("/", "layout")

  // Only allow internal redirect targets.
  const next = data.next && data.next.startsWith("/") ? data.next : "/account"
  redirect(next)
}

export async function signUp(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  marketingOptIn: boolean
}): Promise<ActionResult> {
  // By IP: signup abuse comes from one source creating many accounts.
  const gate = await rateLimit("signUp")
  if (!gate.allowed) return { error: rateLimitMessage(gate.retryAfter) }

  const supabase = await createAuthClient()
  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/confirm`,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        marketing_email_opt_in: data.marketingOptIn,
      },
    },
  })

  if (error) return { error: error.message }

  // With email confirmation enabled, signing up with an existing address
  // returns a fake user with no identities instead of an error.
  if (result.user && result.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Try signing in." }
  }

  return {
    ok: true,
    message: "Check your email — we sent you a confirmation link.",
  }
}

// Starts the Google OAuth flow. Running this in a server action (rather than a
// browser client) lets Supabase set the PKCE verifier cookie, which
// /auth/callback needs to exchange the code for a session.
export async function signInWithGoogle(next?: string): Promise<ActionResult> {
  const supabase = await createAuthClient()
  const target = next && next.startsWith("/") ? next : "/account"

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(target)}`,
    },
  })

  if (error) return { error: error.message }
  if (!data.url) return { error: "Could not start Google sign-in." }

  redirect(data.url)
}

export async function signOut(): Promise<void> {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()

  // The cart cookie is not an auth cookie, so signOut() leaves it behind. Drop
  // it too, or the next person on this browser inherits the basket. The cart
  // row itself is kept — signing back in re-claims it via mergeCartOnSignIn.
  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE)

  revalidatePath("/", "layout")
  redirect("/")
}

export async function forgotPassword(data: { email: string }): Promise<ActionResult> {
  // Limited because it sends mail — otherwise it's a free way to flood someone's
  // inbox. The generic success response below is preserved either way, so this
  // still reveals nothing about whether the account exists.
  const gate = await rateLimit("passwordReset", data.email)
  if (!gate.allowed) {
    return {
      ok: true,
      message:
        "If an account exists for that email, a reset link is on its way.",
    }
  }

  const supabase = await createAuthClient()
  await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${appUrl()}/auth/confirm?next=/reset-password`,
  })
  // Always succeed — never reveal whether an account exists.
  return {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way.",
  }
}

export async function resetPassword(data: { password: string }): Promise<ActionResult> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Your reset link has expired. Please request a new one." }
  }

  const { error } = await supabase.auth.updateUser({ password: data.password })
  if (error) return { error: error.message }

  redirect("/account")
}

export async function changePassword(data: { newPassword: string }): Promise<ActionResult> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "You must be signed in." }

  const { error } = await supabase.auth.updateUser({ password: data.newPassword })
  if (error) return { error: error.message }

  return { ok: true, message: "Password updated." }
}

export async function changeEmail(data: { newEmail: string }): Promise<ActionResult> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "You must be signed in." }

  const { error } = await supabase.auth.updateUser(
    { email: data.newEmail },
    { emailRedirectTo: `${appUrl()}/auth/confirm?next=/account/profile` }
  )
  if (error) return { error: error.message }

  return {
    ok: true,
    message:
      "Confirmation links sent to both your current and new email address. The change completes once both are confirmed.",
  }
}
