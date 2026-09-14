// Shared by the server layout (reads the cookie) and the client provider
// (writes it), so deliberately not a server-only module.

export const CONSENT_COOKIE = "mp_cookie_consent"

/** "unset" means the visitor has not answered the banner yet. */
export type ConsentState = "granted" | "denied" | "unset"

/** Anything other than an exact match is treated as no answer given. */
export function parseConsent(raw: string | undefined): ConsentState {
  return raw === "granted" || raw === "denied" ? raw : "unset"
}

/**
 * A GA4 measurement ID looks like `G-XXXXXXXXXX`. The value is interpolated
 * into an inline script, so anything else is dropped rather than injected.
 */
export function googleAnalyticsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null
}

/**
 * Cookie name prefixes Google Analytics writes. Withdrawing consent has to
 * remove what was already set — stopping the script only prevents new writes,
 * and these carry a two-year expiry.
 */
export const ANALYTICS_COOKIE_PREFIXES = ["_ga", "_gid", "_gat"]
