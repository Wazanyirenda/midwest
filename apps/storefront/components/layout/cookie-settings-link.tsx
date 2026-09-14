"use client"

import { useState } from "react"
import { CookiePreferences } from "@/components/layout/cookie-preferences"
import { useConsent } from "@/components/providers/consent"

/**
 * Footer entry point to cookie preferences. Hidden while the banner is still
 * open — the choice is already on screen at that point.
 */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const { consent } = useConsent()
  const [open, setOpen] = useState(false)

  if (consent === "unset") return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Cookie settings
      </button>
      <CookiePreferences open={open} onClose={() => setOpen(false)} />
    </>
  )
}
