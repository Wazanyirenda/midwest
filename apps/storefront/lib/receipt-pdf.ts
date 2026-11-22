import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

/**
 * Receipt PDFs on 4x6 pages, the size of the Zebra's label stock, so one file
 * serves everyone: the customer's email, their account download, and the
 * store's copy, which staff print twice — one copy in the box as the packing
 * slip, one on it as the address label. It is not a carrier label: postage
 * still comes from the carrier or a label service.
 *
 * Drawn rather than rendered from HTML. A headless browser would give richer
 * layout but cannot run on the serverless functions this store deploys to.
 * pdf-lib is pure JS with no native binary and no font files to bundle —
 * StandardFonts are built into every PDF reader — so the same code works
 * locally and in production.
 */

export type ReceiptOrder = {
  displayId: number | string
  createdAt: string
  email: string
  status: string
  paymentProvider: string | null
  subtotalCents: number
  shippingCents: number
  totalCents: number
  shippingAddress: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    phone?: string | null
  } | null
  items: Array<{
    productTitle: string
    variantTitle: string | null
    quantity: number
    unitPriceCents: number
  }>
}

const INK = rgb(0.11, 0.106, 0.094)
const MUTED = rgb(0.42, 0.404, 0.376)

const PAGE_W = 288 // 4 in at 72 pt/in
const PAGE_H = 432 // 6 in
const MARGIN = 16
const RIGHT = PAGE_W - MARGIN
const WIDTH = RIGHT - MARGIN
// Kept clear at the foot of every page: the totals on the last page, a
// "continued" note on the others, and the research-use notice on all of them.
const FOOTER = 92
const AMOUNT_WIDTH = 56

// Only these mean money was taken. A receipt for anything else must not claim
// the order was paid.
const PAID_STATUSES = new Set(["paid", "shipped", "delivered"])

// Manual approval, BTCPay and NOWPayments all take crypto; only Stripe is card.
const CRYPTO_PROVIDERS = new Set(["manual", "btcpay", "nowpayments"])

function paymentMethod(provider: string | null): string {
  if (provider && CRYPTO_PROVIDERS.has(provider)) return "Cryptocurrency"
  if (provider === "stripe") return "Card"
  return "Other"
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** Latin-1 only: StandardFonts cannot encode arbitrary Unicode and will throw. */
function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/≥/g, ">=")
    .replace(/[^\x20-\x7E]/g, "")
}

type Fonts = { body: PDFFont; bold: PDFFont }
type TextOptions = { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }

function text(page: PDFPage, fonts: Fonts, value: string, x: number, y: number, opts: TextOptions = {}) {
  page.drawText(safe(value), {
    x,
    y,
    size: opts.size ?? 10,
    font: opts.bold ? fonts.bold : fonts.body,
    color: opts.color ?? INK,
  })
}

/** Right-aligns against the page edge, so the money column lines up. */
function textRight(page: PDFPage, fonts: Fonts, value: string, y: number, opts: TextOptions = {}) {
  const size = opts.size ?? 10
  const font = opts.bold ? fonts.bold : fonts.body
  text(page, fonts, value, RIGHT - font.widthOfTextAtSize(safe(value), size), y, opts)
}

function rule(page: PDFPage, y: number) {
  page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 1, color: INK })
}

/** Greedy word wrap on real glyph widths, capped with an ellipsis. */
function wrapLines(font: PDFFont, size: number, value: string, width: number, max: number): string[] {
  const words = safe(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
    if (lines.length === max) break
  }
  if (current && lines.length < max) lines.push(current)
  if (lines.length === max && lines.join(" ").length < words.join(" ").length) {
    let last = lines[max - 1]!
    while (last && font.widthOfTextAtSize(`${last}...`, size) > width) last = last.slice(0, -1)
    lines[max - 1] = `${last}...`
  }
  return lines
}

function notice(page: PDFPage, fonts: Fonts) {
  text(page, fonts, "For laboratory research use only.", MARGIN, MARGIN + 13, { size: 7, color: MUTED })
  text(page, fonts, "Not for human or veterinary consumption.", MARGIN, MARGIN + 4, {
    size: 7,
    color: MUTED,
  })
}

export async function buildReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Receipt - Order ${order.displayId}`)
  doc.setProducer("Midwestern Peptides")
  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN - 12

  // ── Header: who it's from, which order, and whether it is paid
  text(page, fonts, "MIDWESTERN PEPTIDES", MARGIN, y, { size: 12, bold: true })
  textRight(page, fonts, "RECEIPT", y, { size: 12, bold: true, color: MUTED })
  y -= 13
  text(page, fonts, `Order ${order.displayId}`, MARGIN, y, { size: 9, bold: true })
  textRight(page, fonts, formatDate(order.createdAt), y, { size: 8, color: MUTED })
  y -= 11
  text(page, fonts, "support@midwesternpeptides.com", MARGIN, y, { size: 8, color: MUTED })
  const method = paymentMethod(order.paymentProvider)
  const paid = PAID_STATUSES.has(order.status)
  textRight(page, fonts, paid ? `PAID - ${method}` : `${order.status.toUpperCase()} - ${method}`, y, {
    size: 8,
    bold: true,
  })
  y -= 9
  rule(page, y)
  y -= 16

  // ── Ship to, large enough to read across a packing bench
  text(page, fonts, "SHIP TO", MARGIN, y, { size: 7, bold: true, color: MUTED })
  y -= 17
  const a = order.shippingAddress
  const name = [a?.first_name, a?.last_name].filter(Boolean).join(" ")
  const address = a
    ? [
        a.address_1 ?? "",
        a.address_2 ?? "",
        [a.city, [a.province, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      ].filter(Boolean)
    : ["No shipping address on file"]
  for (const l of wrapLines(fonts.bold, 15, name || order.email, WIDTH, 2)) {
    text(page, fonts, l, MARGIN, y, { size: 15, bold: true })
    y -= 18
  }
  for (const part of address) {
    for (const l of wrapLines(fonts.body, 13, part, WIDTH, 2)) {
      text(page, fonts, l, MARGIN, y, { size: 13 })
      y -= 16
    }
  }
  if (a?.phone) {
    text(page, fonts, a.phone, MARGIN, y, { size: 10, color: MUTED })
    y -= 14
  }
  if (name) {
    text(page, fonts, order.email, MARGIN, y, { size: 9, color: MUTED })
    y -= 13
  }
  y -= 2
  rule(page, y)
  y -= 14

  // ── Items. A long order runs onto further 4x6 pages rather than being cut
  // short, since this is the customer's receipt as well as the packing slip.
  const itemsHeading = () => {
    text(page, fonts, "ITEMS", MARGIN, y, { size: 7, bold: true, color: MUTED })
    textRight(page, fonts, "AMOUNT", y, { size: 7, bold: true, color: MUTED })
    y -= 14
  }
  itemsHeading()

  for (const item of order.items) {
    const title = item.variantTitle ? `${item.productTitle} - ${item.variantTitle}` : item.productTitle
    const lines = wrapLines(fonts.body, 10, `${item.quantity} x ${title}`, WIDTH - AMOUNT_WIDTH, 2)
    // The unit price sits under the title, so "3 x ..." reads against its
    // line total.
    const each = item.quantity > 1 ? 11 : 0
    const height = lines.length * 12 + each + 4

    if (y - height < MARGIN + FOOTER + 12) {
      text(page, fonts, "Continued on the next page", MARGIN, MARGIN + FOOTER - 14, { size: 9, bold: true })
      notice(page, fonts)
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN - 12
      text(page, fonts, "MIDWESTERN PEPTIDES", MARGIN, y, { size: 12, bold: true })
      textRight(page, fonts, `Order ${order.displayId}`, y, { size: 9, bold: true })
      y -= 9
      rule(page, y)
      y -= 16
      itemsHeading()
    }

    textRight(page, fonts, money(item.unitPriceCents * item.quantity), y, { size: 10, bold: true })
    for (const l of lines) {
      text(page, fonts, l, MARGIN, y, { size: 10 })
      y -= 12
    }
    if (each) {
      text(page, fonts, `${money(item.unitPriceCents)} each`, MARGIN + 12, y + 1, { size: 8, color: MUTED })
      y -= each
    }
    y -= 4
  }

  // ── Totals and notice, pinned to the foot of the last page
  let fy = MARGIN + FOOTER
  rule(page, fy)
  fy -= 13
  for (const [label, value] of [
    ["Subtotal", money(order.subtotalCents)],
    ["Shipping", order.shippingCents === 0 ? "Free" : money(order.shippingCents)],
  ] as const) {
    text(page, fonts, label, MARGIN, fy, { size: 9, color: MUTED })
    textRight(page, fonts, value, fy, { size: 9 })
    fy -= 12
  }
  text(page, fonts, paid ? "Total paid" : "Total", MARGIN, fy, { size: 11, bold: true })
  textRight(page, fonts, money(order.totalCents), fy, { size: 11, bold: true })
  notice(page, fonts)

  return Buffer.from(await doc.save())
}
