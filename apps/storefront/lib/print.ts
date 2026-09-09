import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings, type SiteSettings } from "@/lib/settings"
import { formatCartTotal } from "@/lib/cart"
import { sendZplToPrinter, zebraCloudConfigured } from "@/lib/zebra-cloud"

/**
 * Packing labels for the Zebra ZD421C, rendered as ZPL and queued in
 * print_jobs. Nothing here talks to the printer's LAN address — see the
 * migration for why the queue exists and how it drains.
 */

// 4x6 label at 300 dpi. The ZD421C is a 300 dpi unit, so dots = inches x 300.
const LABEL_WIDTH = 1200
const LABEL_HEIGHT = 1800
const MARGIN = 32
const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2

// Room kept at the foot of the label for the totals rule and the barcode.
const FOOTER_RESERVE = 300

// Character budget per wrapped line at the item font size. ^FB wraps on real
// glyph widths; this only decides how much vertical space to reserve, so it is
// deliberately pessimistic — over-reserving prints an honest overflow note,
// under-reserving would run text off the label.
const ITEM_FONT = 34
const ITEM_CHARS_PER_LINE = 50
const ITEM_MAX_LINES = 2

const MAX_COPIES = 5

export type LabelOrder = {
  display_id: number
  email: string
  created_at: string
  total_cents: number
  shipping_address: Record<string, string> | null
  items: Array<{
    product_title: string
    variant_title: string | null
    quantity: number
  }>
}

const ORDER_LABEL_FIELDS =
  "display_id,email,created_at,total_cents,shipping_address," +
  "items:order_items(product_title,variant_title,quantity)"

/**
 * Strips the characters that would be read as commands instead of text.
 * `^` and `~` start ZPL instructions and a backslash escapes inside an ^FB
 * block, so one left in a product title or a street address would corrupt the
 * label — or, with a crafted value, append instructions of its own.
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

function line(y: number, size: number, value: string): string {
  return `^FO${MARGIN},${y}^A0N,${size},${size}^FD${value}^FS`
}

function wrapped(y: number, size: number, value: string, maxLines: number): string {
  return (
    `^FO${MARGIN},${y}^A0N,${size},${size}` +
    `^FB${CONTENT_WIDTH},${maxLines},0,L^FD${value}^FS`
  )
}

function rule(y: number): string {
  return `^FO${MARGIN},${y}^GB${CONTENT_WIDTH},2,2^FS`
}

/** Store time, so a label printed in the shop reads in the shop's clock. */
function placedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function addressLines(order: LabelOrder): string[] {
  const a = order.shipping_address
  if (!a) return [zplSafe(order.email, 60), "No shipping address on file"]

  const name = zplSafe(`${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(), 60)
  const region = zplSafe(
    `${a.city ?? ""}, ${a.province ?? ""} ${a.postal_code ?? ""}`.trim(),
    60
  )

  return [
    name || zplSafe(order.email, 60),
    zplSafe(a.address_1, 60),
    zplSafe(a.address_2, 60),
    region,
    zplSafe(a.phone, 40),
  ].filter(Boolean)
}

function itemLabel(item: LabelOrder["items"][number]): string {
  const title = item.variant_title
    ? `${item.product_title} - ${item.variant_title}`
    : item.product_title
  return zplSafe(`${item.quantity} x ${title}`, 140)
}

/**
 * One 4x6 packing label. Everything is laid out against a running y cursor so
 * that a two-line product title pushes what follows down instead of printing
 * over it.
 */
export function renderOrderLabelZpl(order: LabelOrder, copies: number): string {
  const parts: string[] = [
    "^XA",
    "^CI28", // UTF-8, so an accented name prints as itself
    `^PW${LABEL_WIDTH}`,
    `^LL${LABEL_HEIGHT}`,
    "^LH0,0",
  ]

  let y = 36
  parts.push(line(y, 56, "Midwestern Peptides"))
  y += 70
  parts.push(line(y, 34, `Order #${order.display_id}   ${placedAt(order.created_at)}`))
  y += 48
  parts.push(rule(y))
  y += 26

  parts.push(line(y, 26, "SHIP TO"))
  y += 36
  const address = addressLines(order)
  parts.push(wrapped(y, 40, address.join("\\&"), address.length))
  y += address.length * 46 + 16
  parts.push(rule(y))
  y += 26

  parts.push(line(y, 26, "ITEMS"))
  y += 36

  let printed = 0
  for (const item of order.items) {
    const value = itemLabel(item)
    const lines = Math.min(
      Math.ceil(value.length / ITEM_CHARS_PER_LINE) || 1,
      ITEM_MAX_LINES
    )
    const height = lines * (ITEM_FONT + 8) + 6

    // Stop before running into the footer. The overflow note below is printed
    // instead, so a long order is never silently short of items.
    if (y + height > LABEL_HEIGHT - FOOTER_RESERVE) break

    parts.push(wrapped(y, ITEM_FONT, value, lines))
    y += height
    printed += 1
  }

  const remaining = order.items.length - printed
  if (remaining > 0) {
    parts.push(line(y, 30, `+ ${remaining} more item(s) - see admin`))
  }

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const footerY = LABEL_HEIGHT - FOOTER_RESERVE + 40
  parts.push(rule(footerY))
  parts.push(
    line(footerY + 24, 34, `${units} unit(s)   ${formatCartTotal(order.total_cents)}`)
  )
  parts.push(
    `^BY3,3,90^FO${MARGIN},${footerY + 80}^BCN,110,Y,N,N^FD${order.display_id}^FS`
  )

  // ^PQ repeats the whole label; copies is clamped by the caller.
  parts.push(`^PQ${copies},0,0,N`)
  parts.push("^XZ")

  return parts.join("\n")
}

/**
 * Hands a job to Zebra's cloud when it is configured. A failure leaves the row
 * queued with the reason recorded, so the local agent or the retry sweep can
 * still take it — a label is never dropped because one delivery was down.
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

/**
 * Queues the packing label for an order and tries to deliver it immediately.
 *
 * Never throws. It is called from payment webhooks, where an exception would
 * return 500 and make the provider retry a payment that has already committed
 * — the same reason the confirmation email is fire-and-forget.
 *
 * `force` is for the admin reprint button, which is an explicit instruction and
 * so ignores the auto-print setting.
 */
export async function queueOrderLabel(
  orderId: string,
  opts: { force?: boolean } = {}
): Promise<{ error?: string }> {
  try {
    const settings = await getSiteSettings()
    if (!opts.force && !settings.autoPrintOrderLabels) return {}

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_LABEL_FIELDS)
      .eq("id", orderId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return { error: "Order not found." }

    const order = data as unknown as LabelOrder
    const copies = Math.min(
      Math.max(Math.round(settings.printLabelCopies), 1),
      MAX_COPIES
    )
    const zpl = renderOrderLabelZpl(order, copies)

    const { data: job, error: insertError } = await supabase
      .from("print_jobs")
      .insert({ order_id: orderId, kind: "order_label", payload: zpl })
      .select("id")
      .single()
    if (insertError) throw new Error(insertError.message)

    await dispatch(job.id, zpl, settings)
    return {}
  } catch (e) {
    console.error("[print] queueOrderLabel failed:", e)
    return { error: "Could not queue the label." }
  }
}

/**
 * Re-attempts cloud delivery for labels the printer was not reachable for.
 * Runs from the cron route; the local agent needs none of this because it
 * polls for whatever is still queued.
 */
export async function retryPendingPrintJobs(limit = 20): Promise<number> {
  const settings = await getSiteSettings()
  if (!zebraCloudConfigured() || !settings.labelPrinterSerial) return 0

  const { data } = await supabase
    .from("print_jobs")
    .select("id,payload,attempts")
    .eq("status", "queued")
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
