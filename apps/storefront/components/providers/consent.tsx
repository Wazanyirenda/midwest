"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import {
  CONSENT_COOKIE,
  ANALYTICS_COOKIE_PREFIXES,
  type ConsentState,
} from "@/lib/consent"


/**
 * Google writes its cookies on the registrable domain, so clearing them means
 * expiring each name against every domain scope it could have been set on —
 * the exact host, the dot-prefixed host, and the parent domain.
 */
function clearAnalyticsCookies() {
  const host = window.location.hostname
  const parts = host.split(".")
  const domains = [
    undefined,
    host,
    `.${host}`,
    ...(parts.length > 2 ? [`.${parts.slice(-2).join(".")}`] : []),
  ]

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim()
    if (!name) continue
    if (!ANALYTICS_COOKIE_PREFIXES.some((p) => name.startsWith(p))) continue

    for (const domain of domains) {
      document.cookie =
        `${name}=; Path=/; Max-Age=0; SameSite=Lax` +
        (domain ? `; Domain=${domain}` : "")
    }
  }
}

type ConsentValue = {
  consent: ConsentState
  decide: (next: "granted" | "denied") => void
  /** Clears the stored answer and re-opens the banner. */
}

const ConsentContext = createContext<ConsentValue>({
  consent: "unset",
  decide: () => {},
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
    // Declining after previously accepting has to remove what was already set.
    if (next === "denied") clearAnalyticsCookies()
    setConsent(next)
  }, [])


  const value = useMemo<ConsentValue>(
    () => ({ consent, decide }),
    [consent, decide]
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
