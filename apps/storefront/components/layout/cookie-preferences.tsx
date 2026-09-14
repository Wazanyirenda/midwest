"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { X, Check } from "lucide-react"
import { useConsent } from "@/components/providers/consent"

/**
 * Cookie preferences. Reopening the plain banner technically satisfied
 * "withdrawal must be as easy as consent", but it told the visitor nothing —
 * not what is stored, not what they had already chosen. This shows the current
 * answer, names the cookies in each category, and lets analytics be switched
 * off again without guessing which button undoes what.
 */
export function CookiePreferences({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { consent, decide } = useConsent()
  const [analytics, setAnalytics] = useState(consent === "granted")
  const panelRef = useRef<HTMLDivElement>(null)

  // Re-sync whenever it opens: the answer may have changed since last time.
  useEffect(() => {
    if (open) setAnalytics(consent === "granted")
  }, [open, consent])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  function save() {
    decide(analytics ? "granted" : "denied")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="cookie-prefs-title" className="text-xl font-bold text-sand-900">
            Cookie preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 rounded-full p-1 text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-900"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-sand-600">
          You currently have analytics{" "}
          <strong className="font-semibold text-sand-900">
            {consent === "granted" ? "switched on" : consent === "denied" ? "switched off" : "undecided"}
          </strong>
          . Changing this takes effect immediately.
        </p>

        <div className="space-y-3">
          {/* Strictly necessary */}
          <div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-sand-900">Strictly necessary</p>
                <p className="mt-1 text-sm leading-relaxed text-sand-600">
                  Keeps you signed in and remembers your cart through checkout.
                  The store cannot work without these, so they are not optional.
                </p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-sand-200 px-2.5 py-1 text-xs font-semibold text-sand-700">
                <Check size={13} strokeWidth={3} /> Always on
              </span>
            </div>
            <p className="mt-3 font-mono text-2xs text-sand-500">
              sb-* (session) · cart_id (7 days) · mp_cookie_consent (1 year)
            </p>
          </div>

          {/* Analytics */}
          <label className="block cursor-pointer rounded-xl border border-sand-200 bg-white p-4 transition-colors hover:border-sand-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-sand-900">Analytics</p>
                <p className="mt-1 text-sm leading-relaxed text-sand-600">
                  Google Analytics, so we can see which pages are used. Nothing
                  loads until you allow it, and switching it off deletes what it
                  already stored.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
              />
            </div>
            <p className="mt-3 font-mono text-2xs text-sand-500">
              _ga, _ga_* (up to 2 years)
            </p>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Save preferences
          </button>
          <Link
            href="/privacy"
            className="text-sm font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </div>
  )
}
