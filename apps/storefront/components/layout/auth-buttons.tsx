"use client"

import Link from "next/link"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { User } from "lucide-react"

export function AuthButtons() {
  return (
    <>
      {/* Logged out → profile icon + label triggers sign-in */}
      <SignedOut>
        <SignInButton mode="redirect">
          <button
            aria-label="Sign in"
            className="flex items-center gap-2 text-sand-600 hover:text-ink transition-colors"
          >
            <User size={20} strokeWidth={1.5} />
            <span className="hidden sm:inline text-sm font-medium">Sign in</span>
          </button>
        </SignInButton>
      </SignedOut>

      {/* Logged in → Account link + avatar menu */}
      <SignedIn>
        <Link
          href="/account"
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-sand-600 hover:text-ink transition-colors"
        >
          <User size={18} strokeWidth={1.5} />
          Account
        </Link>
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </SignedIn>
    </>
  )
}
