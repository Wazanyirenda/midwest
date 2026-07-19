"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User } from "lucide-react"
import { signOut } from "@/app/actions/auth"

export type AuthUser = {
  email: string
  firstName: string | null
  avatarUrl: string | null
}

const MENU_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Addresses", href: "/account/addresses" },
]

export function AuthButtons({ authUser }: { authUser: AuthUser | null }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  if (!authUser) {
    return (
      <Link
        href="/sign-in"
        aria-label="Sign in"
        className="flex items-center gap-2 text-sand-600 hover:text-ink transition-colors"
      >
        <User size={20} strokeWidth={1.5} />
        <span className="hidden sm:inline text-sm font-medium">Sign in</span>
      </Link>
    )
  }

  const initial = (authUser.firstName?.[0] ?? authUser.email[0] ?? "?").toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-sand-300 bg-brand-50 text-sm font-semibold text-brand-800 transition-colors hover:border-brand-500"
      >
        {authUser.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authUser.avatarUrl}
            alt="Your avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-sand-200 bg-white py-2 shadow-lg">
          <div className="border-b border-sand-100 px-4 py-2">
            <p className="truncate text-sm font-medium text-ink">
              {authUser.firstName ?? "Researcher"}
            </p>
            <p className="truncate text-xs text-sand-500">{authUser.email}</p>
          </div>
          {MENU_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-2 text-sm text-sand-700 transition-colors hover:bg-sand-50 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="border-t border-sand-100">
            <button
              type="submit"
              className="block w-full px-4 py-2 text-left text-sm text-sand-700 transition-colors hover:bg-sand-50 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
