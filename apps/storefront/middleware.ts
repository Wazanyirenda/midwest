import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PROTECTED_PREFIXES = ["/account", "/checkout", "/admin"]

// lib/admin.ts is server-only and can't be imported here; keep the same
// allowlist semantics inline (empty allowlist = any signed-in user in dev).
function isAdminEmail(email: string | undefined): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length === 0) return process.env.NODE_ENV === "development"
  return !!email && allowed.includes(email.toLowerCase())
}

// Any redirect must carry the refreshed session cookies from updateSession.
function redirectWithCookies(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request)
  const path = request.nextUrl.pathname

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = ""
    url.searchParams.set("next", path)
    return redirectWithCookies(url, response)
  }

  if (path.startsWith("/admin") && user && !isAdminEmail(user.email)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
