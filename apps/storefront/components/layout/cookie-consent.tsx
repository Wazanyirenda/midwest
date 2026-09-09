"use client"

import Link from "next/link"
import { useConsent } from "@/components/providers/consent"

/**
 * Only the analytics cookie is in question here. Session and cart cookies are
 * strictly necessary and are not consent-gated, so the copy says what the
 * choice actually controls rather than the usual blanket "we use cookies".
 */
export function CookieConsent() {
  const { consent, decide } = useConsent()
  if (consent !== "unset") return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-sand-300">
          We use analytics cookies to understand how the store is used. Sign-in
          and cart cookies are required for checkout and are always on.{" "}
          <Link
            href="/privacy"
            className="text-brand-400 underline underline-offset-2 hover:text-brand-200"
          >
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={() => decide("denied")}
            className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-sand-300 transition-colors hover:border-white/40 hover:text-white"
          >
            Decline
          </button>
          <button
            onClick={() => decide("granted")}
            className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
