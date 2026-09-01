import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PROTECTED_PREFIXES = ["/account", "/checkout", "/admin"]

// Signed out after this long with no requests. Enforced here rather than in
// Supabase's dashboard so it works on any plan and applies to every route.
const IDLE_TIMEOUT_MS = 10 * 60 * 1000
const ACTIVITY_COOKIE = "mw_last_seen"

// Any redirect must carry the refreshed session cookies from updateSession.
function redirectWithCookies(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

/** Clear every Supabase auth cookie so the session is genuinely gone. */
function signOutResponse(request: NextRequest, reason: string) {
  const url = request.nextUrl.clone()
  url.pathname = "/sign-in"
  url.search = ""
  url.searchParams.set("reason", reason)
  if (request.nextUrl.pathname !== "/") {
    url.searchParams.set("next", request.nextUrl.pathname)
  }

  const response = NextResponse.redirect(url)
  for (const cookie of request.cookies.getAll()) {
    // cart_id is included for the same reason signOut clears it: a claimed
    // cart must not outlive the session on a shared browser.
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name === ACTIVITY_COOKIE ||
      cookie.name === "cart_id"
    ) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" })
    }
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request)
  const path = request.nextUrl.pathname
  const now = Date.now()

  // ─── Idle timeout ──────────────────────────────────────────────────────────
  if (user) {
    const lastSeen = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? 0)

    // A missing cookie is a fresh sign-in, not an expired session — only an
    // existing, stale timestamp signs the user out.
    if (lastSeen > 0 && now - lastSeen > IDLE_TIMEOUT_MS) {
      return signOutResponse(request, "timeout")
    }

    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    })
  }

  // ─── Auth gate ─────────────────────────────────────────────────────────────
  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = ""
    url.searchParams.set("next", path)
    return redirectWithCookies(url, response)
  }

  // ─── Admin gate ────────────────────────────────────────────────────────────
  // Coarse check only. The authoritative role check runs in the admin layout
  // and again inside every mutation (lib/admin.ts) — this just avoids rendering
  // the area for someone with no business there. Reads the caller's own profile
  // under RLS, so it can't be used to look up anyone else's role.
  if (path.startsWith("/admin") && user) {
    const { createServerClient } = await import("@supabase/ssr")
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = data?.role ?? "customer"
    const bootstrap = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const isBootstrap =
      !!user.email && bootstrap.includes(user.email.toLowerCase())

    if (role !== "admin" && role !== "staff" && !isBootstrap) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.search = ""
      return redirectWithCookies(url, response)
    }
  }

  return response
}

export const config = {
  matcher: [
    // api/webhooks is excluded: provider callbacks carry no session cookie, and
    // running updateSession on them is pointless work on a latency-sensitive path.
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
