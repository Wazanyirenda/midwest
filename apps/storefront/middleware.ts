import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/checkout(.*)",
  "/admin(.*)",
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
