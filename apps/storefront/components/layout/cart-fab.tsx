"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { useConsent } from "@/components/providers/consent"

/** Pages where a shortcut to the cart is noise — you are already there. */
const HIDDEN_ON = ["/cart", "/checkout"]

/**
 * Floating cart shortcut. Only appears once there is something in the cart, so
 * it is a reminder rather than permanent furniture.
 *
 * It lifts above the cookie banner while that is showing — the banner is fixed
 * to the same corner of the screen, and consent state is the only reliable way
 * to know whether it is occupying that space.
 */
export function CartFab({ count }: { count: number }) {
  const pathname = usePathname()
  const { consent } = useConsent()

  if (count <= 0) return null
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null
  if (pathname.startsWith("/admin")) return null

  const bannerShowing = consent === "unset"

  return (
    <Link
      href="/cart"
      aria-label={`Cart — ${count} ${count === 1 ? "item" : "items"}`}
      className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-900/25 transition-all hover:bg-brand-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:right-6 ${
        bannerShowing ? "bottom-40 sm:bottom-28" : "bottom-6"
      }`}
    >
      <ShoppingCart size={22} strokeWidth={1.75} />
      <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-accent-400 px-1.5 text-xs font-bold text-ink">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  )
}
