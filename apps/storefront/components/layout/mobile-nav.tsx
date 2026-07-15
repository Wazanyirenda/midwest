"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"

const NAV_LINKS = [
  { label: "Products",         href: "/products" },
  { label: "Research Library", href: "/blog" },
  { label: "My Account",       href: "/account" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="text-sand-600 hover:text-ink transition-colors md:hidden"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-down drawer */}
      <div className={`
        fixed left-0 right-0 top-[calc(var(--header-height,3.5rem)+1.25rem)] z-50 md:hidden
        bg-white border-b border-sand-200
        transition-all duration-200
        ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}
      `}>
        <div className="mx-auto max-w-7xl px-4 py-5">
          <nav className="space-y-0 divide-y divide-sand-100">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between py-3.5 text-base text-sand-700 hover:text-ink transition-colors"
              >
                {link.label}
                <svg className="h-4 w-4 text-sand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            ))}
          </nav>

          <div className="mt-5 pt-4 border-t border-sand-100">
            <SignedOut>
              <SignInButton mode="redirect">
                <button className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink-soft transition-colors">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3">
                <UserButton />
                <span className="text-sm text-sand-600">Manage your account</span>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </>
  )
}
