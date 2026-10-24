// Shared by middleware (edge) and server code, so no "server-only" import —
// it is a pure function with nothing secret in it.

const PROBE_ORIGIN = "http://next.invalid"

/**
 * Returns `raw` as a same-origin path (with its query string) if it is safe to
 * redirect to, otherwise `fallback`. `next=` is attacker-controlled
 * (AGENTS.md §3): "//evil.com" and "/\evil.com" are protocol-relative to a
 * browser, and browsers drop tabs/newlines, so "/\t/evil.com" becomes
 * "//evil.com" — all rejected before the origin check below.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback
  if (raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback

  try {
    const url = new URL(raw, PROBE_ORIGIN)
    if (url.origin !== PROBE_ORIGIN) return fallback
    // Emit the parsed form, so what was checked is exactly what is redirected
    // to — and re-check it, since dot segments collapse "/..//evil.com" into
    // "//evil.com" without changing the origin.
    const path = url.pathname + url.search + url.hash
    return path.startsWith("//") ? fallback : path
  } catch {
    return fallback
  }
}
