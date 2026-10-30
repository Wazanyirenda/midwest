import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings, type SiteSettings } from "@/lib/settings"
import { formatCartTotal } from "@/lib/cart"
import { sendZplToPrinter, zebraCloudConfigured } from "@/lib/zebra-cloud"

/**
 * Order receipts for the Zebra ZD421C, printed on its 4x6 stock, rendered as
 * ZPL and queued in print_jobs. One receipt doubles as the packing slip: it
 * carries the ship-to block as well as the prices. Nothing here talks to the printer's LAN address — see the
 * migration for why the queue exists and how it drains.
 */

// 4x6 label at 300 dpi. The ZD421C is a 300 dpi unit, so dots = inches x 300.
const LABEL_WIDTH = 1200
const LABEL_HEIGHT = 1800
const MARGIN = 32
const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2

// Room kept at the foot of the receipt for the totals, the payment line, the
// barcode and the research-use notice.
const FOOTER_RESERVE = 470

// Right-hand column the line amounts are right-aligned in.
const AMOUNT_WIDTH = 240
const ITEM_TEXT_WIDTH = CONTENT_WIDTH - AMOUNT_WIDTH - 20

// Character budget per wrapped line at the item font size. ^FB wraps on real
// glyph widths; this only decides how much vertical space to reserve, so it is
// deliberately pessimistic — over-reserving prints an honest overflow note,
// under-reserving would run text off the label.
const ITEM_FONT = 34
const ITEM_CHARS_PER_LINE = 38
const ITEM_MAX_LINES = 2

const MAX_COPIES = 5

export type LabelOrder = {
  display_id: number
  email: string
  created_at: string
  status: string
  payment_provider: string | null
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  shipping_address: Record<string, string> | null
  items: Array<{
    product_title: string
    variant_title: string | null
    quantity: number
    unit_price_cents: number
  }>
}

const ORDER_LABEL_FIELDS =
  "display_id,email,created_at,status,payment_provider,subtotal_cents," +
  "shipping_cents,total_cents,shipping_address," +
  "items:order_items(product_title,variant_title,quantity,unit_price_cents)"

// Only these mean money was taken. A reprint of anything else must not claim
// the order was paid.
const PAID_STATUSES = new Set(["paid", "shipped", "delivered"])

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

/** Right-aligned in the full content width — the money column. */
function amount(y: number, size: number, value: string): string {
  return (
    `^FO${MARGIN},${y}^A0N,${size},${size}` +
    `^FB${CONTENT_WIDTH},1,0,R^FD${value}^FS`
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

function paymentLine(order: LabelOrder): string {
  const method =
    order.payment_provider === "nowpayments"
      ? "Crypto"
      : order.payment_provider === "stripe"
        ? "Card"
        : "Other"
  return PAID_STATUSES.has(order.status)
    ? `PAID - ${method}`
    : `Payment ${zplSafe(order.status, 20)} - ${method}`
}

/**
 * One 4x6 receipt. Everything is laid out against a running y cursor so that
 * a two-line product title pushes what follows down instead of printing over
 * it.
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
  parts.push(amount(y + 10, 44, "RECEIPT"))
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
  parts.push(amount(y, 26, "AMOUNT"))
  y += 36

  let printed = 0
  for (const item of order.items) {
    const value = itemLabel(item)
    const lines = Math.min(
      Math.ceil(value.length / ITEM_CHARS_PER_LINE) || 1,
      ITEM_MAX_LINES
    )
    // The unit price sits under the title, so a quantity of 3 reads as
    // "3 x ... / $20.00 each" against a $60.00 line total.
    const height = lines * (ITEM_FONT + 8) + 34 + 10

    // Stop before running into the footer. The overflow note below is printed
    // instead, so a long order is never silently short of items.
    if (y + height > LABEL_HEIGHT - FOOTER_RESERVE) break

    parts.push(
      `^FO${MARGIN},${y}^A0N,${ITEM_FONT},${ITEM_FONT}` +
        `^FB${ITEM_TEXT_WIDTH},${lines},0,L^FD${value}^FS`
    )
    parts.push(amount(y, ITEM_FONT, formatCartTotal(item.unit_price_cents * item.quantity)))
    parts.push(
      line(y + lines * (ITEM_FONT + 8), 26, `${formatCartTotal(item.unit_price_cents)} each`)
    )
    y += height
    printed += 1
  }

  const remaining = order.items.length - printed
  if (remaining > 0) {
    parts.push(line(y, 30, `+ ${remaining} more item(s) - full list in the order email`))
  }

  const footerY = LABEL_HEIGHT - FOOTER_RESERVE + 20
  parts.push(rule(footerY))

  let fy = footerY + 22
  for (const [label, value] of [
    ["Subtotal", formatCartTotal(order.subtotal_cents)],
    ["Shipping", order.shipping_cents === 0 ? "Free" : formatCartTotal(order.shipping_cents)],
  ] as const) {
    parts.push(line(fy, 32, label))
    parts.push(amount(fy, 32, value))
    fy += 42
  }
  parts.push(line(fy, 44, "Total"))
  parts.push(amount(fy, 44, formatCartTotal(order.total_cents)))
  fy += 56
  parts.push(line(fy, 32, paymentLine(order)))
  fy += 48

  parts.push(`^BY3,3,90^FO${MARGIN},${fy}^BCN,90,Y,N,N^FD${order.display_id}^FS`)
  fy += 140

  parts.push(line(fy, 24, "For laboratory research use only. Not for human or veterinary use."))

  // ^PQ repeats the whole receipt; copies is clamped by the caller.
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
