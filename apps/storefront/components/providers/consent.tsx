"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { CONSENT_COOKIE, type ConsentState } from "@/lib/consent"

type ConsentValue = {
  consent: ConsentState
  decide: (next: "granted" | "denied") => void
  /** Clears the stored answer and re-opens the banner. */
  reset: () => void
}

const ConsentContext = createContext<ConsentValue>({
  consent: "unset",
  decide: () => {},
  reset: () => {},
})

export function useConsent() {
  return useContext(ConsentContext)
}

/**
 * The answer is seeded from the cookie on the server, so a returning visitor
 * never sees the banner flash and analytics can render in the first response.
 */
export function ConsentProvider({
  initial,
  children,
}: {
  initial: ConsentState
  children: React.ReactNode
}) {
  const [consent, setConsent] = useState<ConsentState>(initial)

  const decide = useCallback((next: "granted" | "denied") => {
    // A year, so the question is not re-asked every session. Not httpOnly —
    // the client has to read its own answer to decide what to load.
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie =
      `${CONSENT_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
    setConsent(next)
  }, [])

  const reset = useCallback(() => {
    document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    setConsent("unset")
  }, [])

  const value = useMemo<ConsentValue>(
    () => ({ consent, decide, reset }),
    [consent, decide, reset]
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
