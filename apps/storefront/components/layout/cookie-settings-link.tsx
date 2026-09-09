"use client"

import { useConsent } from "@/components/providers/consent"

/**
 * Withdrawing consent has to be as easy as giving it, so this clears the stored
 * answer and puts the banner back rather than sending the visitor to a settings
 * page. Hidden while the banner is already open — there is nothing to reopen.
 */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const { consent, reset } = useConsent()
  if (consent === "unset") return null

  return (
    <button type="button" onClick={reset} className={className}>
      Cookie settings
    </button>
  )
}
