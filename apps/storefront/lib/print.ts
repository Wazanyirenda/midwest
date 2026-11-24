import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings, type SiteSettings } from "@/lib/settings"
import { sendZplToPrinter, zebraCloudConfigured } from "@/lib/zebra-cloud"
import { sendPrintAlertEmail } from "@/lib/email"
import { code128B } from "@/lib/code128"
import { LABEL_LOGO_GFA, LABEL_LOGO_HEIGHT_DOTS } from "@/lib/label-logo-zpl"
import {
  buildReceiptPdf,
  returnAddressLines,
  toReceiptOrder,
  type OrderPrintRow,
} from "@/lib/receipt-pdf"

/**
 * What the shop prints when an order is paid, queued in print_jobs:
 *
 *   order_label    4x6 shipping label for the Zebra, rendered here as ZPL. The
 *                  same layout as the PDF label in lib/receipt-pdf.ts.
 *   order_receipt  The A4 receipt for the office printer. Stored without a
 *                  payload and drawn when the print station claims it, so a
 *                  PDF of the customer's address never sits in the database.
 *
 * Nothing here talks to a printer's LAN address — see the print_jobs migration
 * for why the queue exists and how it drains.
 */

// 4x6 label at 300 dpi. The ZD421C is a 300 dpi unit, so dots = inches x 300.
const LABEL_WIDTH = 1200
const LABEL_HEIGHT = 1800
// Well inside the edge, so a slightly skewed roll never clips anything.
const MARGIN = 108
const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2

// Barcode: 6 dots per module, and tall enough for a handheld scanner. Raised
// off the bottom edge with the order number printed under it.
const BARCODE_MODULE_DOTS = 6
const BARCODE_HEIGHT = 192
const BARCODE_TOP = 1333

// The printer's ^A0 font is a condensed sans with no width table to measure
// against, so text width is estimated from character count. Only used to
// centre the address block; ^FB still wraps on the real glyph widths.
const CHAR_WIDTH_RATIO = 0.55

const MAX_COPIES = 5

// Jobs each printer handles. Labels and test prints are ZPL for the Zebra;
// receipts are PDFs for the office printer.
export const LABEL_KINDS = ["order_label", "test"] as const
export const RECEIPT_KINDS = ["order_receipt"] as const

// The agent polls every few seconds while it can reach a printer, so a
// minute and a half of silence means nothing is printing right now.
const AGENT_STALE_MS = 90 * 1000

const ORDER_PRINT_FIELDS =
  "order_code,email,created_at,status,payment_provider,subtotal_cents," +
  "shipping_cents,total_cents,shipping_address," +
  "items:order_items(product_title,variant_title,quantity,unit_price_cents)"

/**
 * Strips the characters that would be read as commands instead of text.
 * `^` and `~` start ZPL instructions and a backslash escapes inside an ^FB
 * block, so one left in a street address would corrupt the label — or, with a
 * crafted value, append instructions of its own.
 */
function zplSafe(value: string | null | undefined, max = 120): string {
  if (!value) return ""
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\^~\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

/** One field: text at (x, y), wrapped in a box `width` wide. */
function field(x: number, y: number, size: number, width: number, value: string, opts: {
  lines?: number
  align?: "L" | "C" | "R"
} = {}): string {
  return (
    `^FO${x},${y}^A0N,${size},${size}` +
    `^FB${width},${opts.lines ?? 1},0,${opts.align ?? "L"}^FD${value}^FS`
  )
}

function rule(y: number): string {
  return `^FO${MARGIN},${y}^GB${CONTENT_WIDTH},4,4^FS`
}

/** Store time, so a label printed in the shop reads in the shop's calendar. */
function orderDate(iso: string | undefined): string {
  return new Date(iso ?? Date.now()).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function estimatedWidth(value: string, size: number): number {
  return value.length * size * CHAR_WIDTH_RATIO
}

/**
 * One 4x6 shipping label: logo and order number, the return address, the
 * ship-to block centred in the space left, and the order number as a barcode.
 * No items or prices — those are on the receipt inside the box.
 */
export function renderOrderLabelZpl(order: OrderPrintRow, copies: number, returnAddress: string[]): string {
  const parts: string[] = [
    "^XA",
    "^CI28", // UTF-8, so an accented name prints as itself
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    "^LH0,0",
  ]

  // ── Logo, with the order number and date beside it
  parts.push(`^FO${MARGIN},${MARGIN}${LABEL_LOGO_GFA}^FS`)
  parts.push(field(MARGIN, MARGIN + 25, 42, CONTENT_WIDTH, `Order ${zplSafe(order.order_code, 40)}`, { align: "R" }))
  parts.push(field(MARGIN, MARGIN + 83, 33, CONTENT_WIDTH, orderDate(order.created_at), { align: "R" }))
  let y = MARGIN + LABEL_LOGO_HEIGHT_DOTS + 33
  parts.push(rule(y))

  // ── From: the return address, small. Left out until one is set in admin.
  const from = returnAddress.map((l) => zplSafe(l, 60)).filter(Boolean)
  if (from.length > 0) {
    y += 30
    parts.push(field(MARGIN, y, 29, CONTENT_WIDTH, "FROM"))
    y += 45
    for (const value of from) {
      parts.push(field(MARGIN, y, 37, CONTENT_WIDTH, value))
      y += 46
    }
    y += 12
    parts.push(rule(y))
  }
  const spaceTop = y + 4

  // ── Barcode, then the rule above it, so the address block knows its floor
  const code = zplSafe(order.order_code, 40)
  const barcodeWidth = code128B(code).reduce((sum, w) => sum + w, 0) * BARCODE_MODULE_DOTS
  const barcodeX = Math.max(MARGIN, Math.round((LABEL_WIDTH - barcodeWidth) / 2))
  const spaceBottom = BARCODE_TOP - 58
  parts.push(rule(spaceBottom))
  // >: forces code set B, so the printed width matches the one computed above.
  parts.push(`^BY${BARCODE_MODULE_DOTS}^FO${barcodeX},${BARCODE_TOP}^BCN,${BARCODE_HEIGHT},N,N,N^FD>:${code}^FS`)
  parts.push(field(MARGIN, BARCODE_TOP + BARCODE_HEIGHT + 22, 42, CONTENT_WIDTH, code, { align: "C" }))

  // ── Ship to: as large as fits, centred between the two rules. The lines stay
  // left-aligned, as carriers expect, but the block sits in the middle.
  const a = order.shipping_address
  const name = zplSafe(`${a?.first_name ?? ""} ${a?.last_name ?? ""}`.trim(), 60) || zplSafe(order.email, 60)
  const region = zplSafe(
    [a?.city, [a?.province, a?.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    60
  )
  const rows: Array<{ value: string; size: number; step: number }> = [
    { value: "SHIP TO", size: 33, step: 100 },
    { value: name, size: 83, step: 100 },
    ...(a
      ? [zplSafe(a.address_1, 60), zplSafe(a.address_2, 60), region]
      : ["No shipping address on file"]
    )
      .filter(Boolean)
      .map((value) => ({ value, size: 67, step: 83 })),
  ]
  const phone = zplSafe(a?.phone, 40)
  if (phone) rows.push({ value: phone, size: 42, step: 58 })

  const blockWidth = Math.min(Math.max(...rows.map((r) => estimatedWidth(r.value, r.size))), CONTENT_WIDTH)
  const blockX = Math.max(MARGIN, Math.round((LABEL_WIDTH - blockWidth) / 2))
  const boxWidth = LABEL_WIDTH - MARGIN - blockX
  // A line too wide for the box wraps once, so it gets two lines' height.
  const lineCounts = rows.map((r) => (estimatedWidth(r.value, r.size) > boxWidth ? 2 : 1))
  const blockHeight = rows.reduce((sum, r, i) => sum + r.step * lineCounts[i]!, 0) - (rows.at(-1)!.step - rows.at(-1)!.size)
  y = spaceTop + Math.max(Math.round((spaceBottom - spaceTop - blockHeight) / 2), 20)
  rows.forEach((r, i) => {
    parts.push(field(blockX, y, r.size, boxWidth, r.value, { lines: lineCounts[i] }))
    y += r.step * lineCounts[i]!
  })

  // ^PQ repeats the whole label; copies is clamped by the caller.
  parts.push(`^PQ${copies},0,0,N`)
  parts.push("^XZ")

  return parts.join("\n")
}

/**
 * The receipt for a claimed job, as base64 for the print station. Drawn on
 * demand rather than stored — see the note at the top of this file.
 */
export async function renderReceiptPayload(orderId: string): Promise<string> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_PRINT_FIELDS)
    .eq("id", orderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("order not found")

  const pdf = await buildReceiptPdf(toReceiptOrder(data as unknown as OrderPrintRow))
  return pdf.toString("base64")
}

/**
 * Hands a label to Zebra's cloud when it is configured. A failure leaves the
 * row queued with the reason recorded, so the local agent or the retry sweep
 * can still take it — a label is never dropped because one delivery was down.
 */
async function dispatch(
  jobId: string,
  zpl: string,
  settings: SiteSettings
): Promise<void> {
  if (!zebraCloudConfigured() || !settings.labelPrinterSerial) return

  const result = await sendZplToPrinter(settings.labelPrinterSerial, zpl)

  if (result.ok) {
    await supabase
      .from("print_jobs")
      .update({ status: "printed", printed_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "queued")
    return
  }

  console.error(`[print] job ${jobId} cloud delivery failed:`, result.error)
  await supabase
    .from("print_jobs")
    .update({ attempts: 1, last_error: result.error })
    .eq("id", jobId)
    .eq("status", "queued")
}

/** Called on every agent poll — the heartbeat the offline alert reads. */
export async function recordAgentSeen(): Promise<void> {
  const { error } = await supabase
    .from("print_agent_status")
    .upsert({ id: 1, last_seen_at: new Date().toISOString() })
  if (error) console.error("[print] could not record agent heartbeat:", error.message)
}

/**
 * Whether the local agent has polled recently. Null when it can't be told —
 * table missing or unreadable — so the caller stays quiet rather than mailing
 * a false alarm about every order.
 */
async function agentRecentlySeen(): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("print_agent_status")
    .select("last_seen_at")
    .eq("id", 1)
    .maybeSingle()
  if (error) {
    console.error("[print] could not read agent heartbeat:", error.message)
    return null
  }
  if (!data) return false
  return Date.now() - new Date(data.last_seen_at as string).getTime() < AGENT_STALE_MS
}

type Queued = { label: boolean; receipt: boolean }

/**
 * Queues whichever of the label and receipt were asked for. Throws on a
 * database error; the exported wrappers turn that into a logged failure.
 */
async function queueJobs(
  orderId: string,
  want: Queued,
  settings: SiteSettings
): Promise<{ orderCode: string } | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_PRINT_FIELDS)
    .eq("id", orderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const order = data as unknown as OrderPrintRow

  if (want.label) {
    const copies = Math.min(Math.max(Math.round(settings.printLabelCopies), 1), MAX_COPIES)
    const zpl = renderOrderLabelZpl(order, copies, returnAddressLines(settings.returnAddress))
    const { data: job, error: insertError } = await supabase
      .from("print_jobs")
      .insert({ order_id: orderId, kind: "order_label", payload: zpl })
      .select("id")
      .single()
    if (insertError) throw new Error(insertError.message)
    await dispatch(job.id, zpl, settings)
  }

  if (want.receipt) {
    const { error: insertError } = await supabase
      .from("print_jobs")
      .insert({ order_id: orderId, kind: "order_receipt", payload: "" })
    if (insertError) throw new Error(insertError.message)
  }

  return { orderCode: order.order_code }
}

/**
 * Emails the owner when something was queued but the print station has gone
 * quiet. Zebra's cloud reports its own failures through the job row, so a
 * label alone needs no alert when cloud printing is set up; receipts always go
 * through the station.
 */
async function alertIfStationOffline(queued: Queued, orderCode: string): Promise<void> {
  const needsStation = queued.receipt || (queued.label && !zebraCloudConfigured())
  if (needsStation && (await agentRecentlySeen()) === false) {
    await sendPrintAlertEmail({ kind: "offline", orderCodes: [orderCode] })
  }
}

/**
 * Queues the label and receipt for a newly paid order, each only if its
 * auto-print setting is on.
 *
 * Never throws. It is called from payment webhooks, where an exception would
 * return 500 and make the provider retry a payment that has already committed
 * — the same reason the confirmation email is fire-and-forget.
 */
export async function queueOrderPrints(orderId: string): Promise<void> {
  try {
    const settings = await getSiteSettings()
    const want = { label: settings.autoPrintOrderLabels, receipt: settings.autoPrintOrderReceipts }
    if (!want.label && !want.receipt) return

    const queued = await queueJobs(orderId, want, settings)
    if (queued) await alertIfStationOffline(want, queued.orderCode)
  } catch (e) {
    console.error("[print] queueOrderPrints failed:", e)
  }
}

/**
 * Queues one label or one receipt by hand, for the admin print buttons. The
 * button is the instruction, so it ignores the auto-print settings.
 */
export async function queueOrderPrint(
  orderId: string,
  kind: "label" | "receipt"
): Promise<{ error?: string }> {
  try {
    const settings = await getSiteSettings()
    const want = { label: kind === "label", receipt: kind === "receipt" }
    const queued = await queueJobs(orderId, want, settings)
    if (!queued) return { error: "Order not found." }
    await alertIfStationOffline(want, queued.orderCode)
    return {}
  } catch (e) {
    console.error(`[print] queueOrderPrint (${kind}) failed:`, e)
    return { error: kind === "label" ? "Could not queue the label." : "Could not queue the receipt." }
  }
}

/**
 * Re-attempts cloud delivery for labels the printer was not reachable for.
 * Runs from the cron route; the local agent needs none of this because it
 * polls for whatever is still queued. Labels only: Zebra's cloud can't print a
 * receipt.
 */
export async function retryPendingPrintJobs(limit = 20): Promise<number> {
  const settings = await getSiteSettings()
  if (!zebraCloudConfigured() || !settings.labelPrinterSerial) return 0

  const { data } = await supabase
    .from("print_jobs")
    .select("id,payload,attempts")
    .eq("status", "queued")
    .in("kind", [...LABEL_KINDS])
    .gt("attempts", 0)
    .order("created_at")
    .limit(limit)

  let delivered = 0
  for (const job of data ?? []) {
    const result = await sendZplToPrinter(settings.labelPrinterSerial, job.payload)

    if (result.ok) {
      await supabase
        .from("print_jobs")
        .update({ status: "printed", printed_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("status", "queued")
      delivered += 1
      continue
    }

    // Counting attempts is what eventually retires a label that will never
    // print, rather than sweeping it forever.
    await supabase
      .from("print_jobs")
      .update({ attempts: job.attempts + 1, last_error: result.error })
      .eq("id", job.id)
      .eq("status", "queued")
  }

  return delivered
}
