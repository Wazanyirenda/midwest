import { NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings } from "@/lib/settings"
import { rateLimit } from "@/lib/rate-limit"
import { LABEL_KINDS, RECEIPT_KINDS, recordAgentSeen, renderReceiptPayload } from "@/lib/print"
import { sendPrintAlertEmail } from "@/lib/email"

/**
 * Queue endpoint for the local print agent (tools/print-agent).
 *
 * Only needed when Zebra Data Services is not in use: with cloud printing
 * configured, labels are pushed from lib/print.ts and this never gets polled.
 *
 * This is the only authenticated API surface the storefront exposes besides
 * webhooks and auth callbacks (AGENTS.md §1), so it is deliberately narrow:
 * bearer token only, rate limited, and the response carries each job's kind
 * and its printable payload (ZPL for the Zebra, a base64 PDF for the receipt
 * printer) and nothing else — never an order row, an email, or an id a caller
 * could pivot on. A claimed job is handed out once, so a stolen token cannot be
 * used to replay the queue and read past labels.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BATCH = 5
// Tries before a job is retired as failed. Passed to claim_print_jobs too, so
// the claim and the acknowledgement can never disagree about the limit.
const MAX_ATTEMPTS = 5

const AckSchema = z.object({
  printed: z.array(z.string().uuid()).max(50).optional(),
  failed: z
    .array(z.object({ id: z.string().uuid(), error: z.string().max(300) }))
    .max(50)
    .optional(),
})

/**
 * Compares the bearer token in constant time. Both sides are hashed first
 * because timingSafeEqual throws on a length mismatch — and the throw itself
 * would tell an attacker the token's length.
 */
function authorized(request: Request): boolean {
  const expected = process.env.PRINT_AGENT_TOKEN
  if (!expected) return false

  const header = request.headers.get("authorization") ?? ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided) return false

  return timingSafeEqual(
    createHash("sha256").update(provided).digest(),
    createHash("sha256").update(expected).digest()
  )
}

async function guard(request: Request): Promise<NextResponse | null> {
  if (!process.env.PRINT_AGENT_TOKEN) {
    console.error("[print/jobs] PRINT_AGENT_TOKEN not set — refusing to serve")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  const { allowed, retryAfter } = await rateLimit("printAgent")
  if (!allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(retryAfter) } }
    )
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  return null
}

const PRINTER_KINDS: Record<string, readonly string[]> = {
  label: LABEL_KINDS,
  receipt: RECEIPT_KINDS,
}

/**
 * The job kinds for the printers the station says are up, from
 * `?ready=label,receipt`. No parameter means labels only: that is all an older
 * agent can print, and it must never be handed a PDF to send to the Zebra.
 */
function readyKinds(request: Request): string[] {
  const ready = new URL(request.url).searchParams.get("ready")
  if (ready === null) return [...LABEL_KINDS]

  const kinds = new Set<string>()
  for (const printer of ready.slice(0, 40).split(",")) {
    for (const kind of PRINTER_KINDS[printer.trim()] ?? []) kinds.add(kind)
  }
  return [...kinds]
}

type ClaimedJob = { id: string; kind: string; order_id: string | null; payload: string }

/** Claims up to MAX_BATCH jobs for the printers this agent says are up. */
export async function GET(request: Request) {
  const denied = await guard(request)
  if (denied) return denied

  await recordAgentSeen()

  const settings = await getSiteSettings()
  // The host is served from settings so a DHCP change is fixable in /admin
  // without editing a config file on a machine at the shop. Empty means the
  // agent falls back to its own PRINTER_HOST.
  const printerHost = settings.labelPrinterHost

  const kinds = readyKinds(request)
  if (kinds.length === 0) return NextResponse.json({ jobs: [], printerHost })

  const { data, error } = await supabase.rpc("claim_print_jobs", {
    p_limit: MAX_BATCH,
    p_max_attempts: MAX_ATTEMPTS,
    p_kinds: kinds,
  })
  if (error) {
    console.error("[print/jobs] claim failed:", error.message)
    return NextResponse.json({ error: "claim failed" }, { status: 500 })
  }

  const jobs: Array<{ id: string; kind: string; payload: string }> = []
  for (const job of (data ?? []) as ClaimedJob[]) {
    if (job.kind !== "order_receipt") {
      jobs.push({ id: job.id, kind: job.kind, payload: job.payload })
      continue
    }

    try {
      if (!job.order_id) throw new Error("receipt job has no order")
      jobs.push({ id: job.id, kind: job.kind, payload: await renderReceiptPayload(job.order_id) })
    } catch (e) {
      // Never hand out an empty receipt. Same handling as a failed print:
      // retired once out of attempts, otherwise back in the queue, with the
      // reason showing in admin either way.
      console.error(`[print/jobs] receipt ${job.id} could not be drawn:`, e)
      const last_error = "receipt could not be drawn"
      await supabase
        .from("print_jobs")
        .update({ status: "failed", last_error })
        .eq("id", job.id)
        .eq("status", "claimed")
        .gte("attempts", MAX_ATTEMPTS)
      await supabase
        .from("print_jobs")
        .update({ status: "queued", last_error })
        .eq("id", job.id)
        .eq("status", "claimed")
    }
  }

  return NextResponse.json({ jobs, printerHost })
}

/** Acknowledges a batch: what printed, and what did not and why. */
export async function POST(request: Request) {
  const denied = await guard(request)
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const parsed = AckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const { printed = [], failed = [] } = parsed.data

  if (printed.length > 0) {
    // Scoped to 'claimed' so an acknowledgement can only close a job this
    // agent was actually handed.
    const { error } = await supabase
      .from("print_jobs")
      .update({ status: "printed", printed_at: new Date().toISOString() })
      .in("id", printed)
      .eq("status", "claimed")
    if (error) {
      console.error("[print/jobs] ack failed:", error.message)
      return NextResponse.json({ error: "ack failed" }, { status: 500 })
    }
  }

  for (const job of failed) {
    // Out of attempts: retire it as failed so /admin/printing flags it. Left
    // queued, claim_print_jobs would never hand it out again and admin would
    // show it as on its way forever.
    const { data: retired } = await supabase
      .from("print_jobs")
      .update({ status: "failed", last_error: job.error })
      .eq("id", job.id)
      .eq("status", "claimed")
      .gte("attempts", MAX_ATTEMPTS)
      .select("order:orders(order_code)")

    const orderCodes = (retired ?? [])
      .map((r) => (r as unknown as { order: { order_code: string } | null }).order?.order_code)
      .filter((code): code is string => typeof code === "string")
    if (orderCodes.length > 0) {
      await sendPrintAlertEmail({ kind: "failed", orderCodes, detail: job.error })
    }

    // Otherwise back to queued: a printer briefly out of paper retries. A row
    // retired just above no longer matches status = claimed.
    await supabase
      .from("print_jobs")
      .update({ status: "queued", last_error: job.error })
      .eq("id", job.id)
      .eq("status", "claimed")
  }

  return NextResponse.json({ ok: true })
}
