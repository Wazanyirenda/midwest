import "server-only"

/**
 * Zebra Data Services — SendFileToPrinter.
 *
 * The printer keeps an outbound Weblink connection open to Zebra's cloud, so a
 * label posted here reaches a printer sitting on a private LAN with no inbound
 * port, no VPN, and nothing running at the shop. Setup is one JSON file sent to
 * the printer once; see tools/print-agent/README.md.
 *
 * Credentials are per-environment secrets, so they are env vars rather than
 * settings (AGENTS.md §2). The printer's serial is not a secret and the owner
 * changes it when the printer is replaced, so that one is a setting.
 */

const ENDPOINT = "https://api.zebra.com/v2/devices/printers/send"

// Zebra's published ceilings: 10 MB per file, 5 requests/second. A label is a
// couple of KB, so only the size guard is worth enforcing locally.
const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 10_000

export type ZebraResult = { ok: true } | { ok: false; error: string }

/** Whether cloud delivery can be attempted at all. Never returns the key. */
export function zebraCloudConfigured(): boolean {
  return Boolean(process.env.ZEBRA_API_KEY && process.env.ZEBRA_TENANT)
}

/**
 * Posts one ZPL file to a printer by serial number. Returns a result rather
 * than throwing: a printer being offline is an ordinary outcome that belongs in
 * the job's error column, not an exception on the payment path.
 */
export async function sendZplToPrinter(
  serial: string,
  zpl: string
): Promise<ZebraResult> {
  const apikey = process.env.ZEBRA_API_KEY
  const tenant = process.env.ZEBRA_TENANT
  if (!apikey || !tenant) {
    return { ok: false, error: "Zebra Data Services credentials not configured" }
  }
  if (!serial) {
    return { ok: false, error: "No printer serial set in admin settings" }
  }
  if (Buffer.byteLength(zpl, "utf8") > MAX_BYTES) {
    return { ok: false, error: "Label exceeds the 10 MB limit" }
  }

  const form = new FormData()
  form.append("sn", serial)
  form.append(
    "zpl_file",
    new Blob([zpl], { type: "application/octet-stream" }),
    "label.zpl"
  )

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      // Content-Type is deliberately unset — fetch adds the multipart boundary.
      headers: { apikey, tenant },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      // Zebra's body names the failure (unknown serial, printer offline,
      // package not enabled). Truncated, and it never contains order data.
      const detail = (await response.text().catch(() => "")).slice(0, 300)
      return { ok: false, error: `Zebra ${response.status}: ${detail || "no detail"}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
