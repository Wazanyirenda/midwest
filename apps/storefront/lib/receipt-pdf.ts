import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { RECEIPT_LOGO_PNG_BASE64 } from "@/lib/receipt-logo"

/**
 * The order receipt as an A4 PDF, for the customer's email, their account
 * download and the store's copy, which staff print on the office printer and
 * pack in the box. It is not a postage label: postage still comes from the
 * carrier or a label service.
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
const HAIRLINE = rgb(0.85, 0.84, 0.82)
const SHADE = rgb(0.95, 0.945, 0.935)

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
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
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

/** Right-aligns against `right`, so a money column lines up. */
function textRight(page: PDFPage, fonts: Fonts, value: string, right: number, y: number, opts: TextOptions = {}) {
  const size = opts.size ?? 10
  const font = opts.bold ? fonts.bold : fonts.body
  text(page, fonts, value, right - font.widthOfTextAtSize(safe(value), size), y, opts)
}

function rule(page: PDFPage, left: number, right: number, y: number, color = INK, thickness = 1) {
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness, color })
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

function addressLines(order: ReceiptOrder): { name: string; lines: string[] } {
  const a = order.shippingAddress
  const name = [a?.first_name, a?.last_name].filter(Boolean).join(" ")
  const lines = a
    ? [
        a.address_1 ?? "",
        a.address_2 ?? "",
        [a.city, [a.province, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      ].filter(Boolean)
    : ["No shipping address on file"]
  return { name, lines }
}

// ─── A4 receipt ──────────────────────────────────────────────────────────────

const A4_W = 595.28
const A4_H = 841.89
const R_MARGIN = 48
const R_LEFT = R_MARGIN
const R_RIGHT = A4_W - R_MARGIN
const R_WIDTH = R_RIGHT - R_LEFT
// Kept clear at the foot of every page for the support line, the research-use
// notice and the page number.
const R_FOOTER = 56
// Right edges of the item table's number columns.
const COL_AMOUNT = R_RIGHT - 8
const COL_UNIT = COL_AMOUNT - 90
const COL_QTY = COL_UNIT - 80
const ITEM_WIDTH = COL_QTY - 40 - (R_LEFT + 8)
const TOTALS_HEIGHT = 96

function receiptFooter(page: PDFPage, fonts: Fonts, pageNo: number, pages: number) {
  rule(page, R_LEFT, R_RIGHT, R_MARGIN + 34, HAIRLINE)
  text(page, fonts, "Questions? support@midwesternpeptides.com", R_LEFT, R_MARGIN + 20, { size: 8, bold: true })
  text(
    page,
    fonts,
    "For laboratory research use only. Not for human or veterinary consumption.",
    R_LEFT,
    R_MARGIN + 8,
    { size: 8, color: MUTED }
  )
  if (pages > 1) {
    textRight(page, fonts, `Page ${pageNo} of ${pages}`, R_RIGHT, R_MARGIN + 8, { size: 8, color: MUTED })
  }
}

export async function buildReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Receipt - Order ${order.displayId}`)
  doc.setProducer("Midwestern Peptides")
  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  const logo = await doc.embedPng(Buffer.from(RECEIPT_LOGO_PNG_BASE64, "base64"))
  const top = A4_H - R_MARGIN
  const method = paymentMethod(order.paymentProvider)
  const paid = PAID_STATUSES.has(order.status)

  let page = doc.addPage([A4_W, A4_H])

  // ── Header: the logo, and which document this is
  const logoHeight = 60
  page.drawImage(logo, {
    x: R_LEFT,
    y: top - logoHeight,
    width: (logo.width / logo.height) * logoHeight,
    height: logoHeight,
  })
  textRight(page, fonts, "RECEIPT", R_RIGHT, top - 24, { size: 24, bold: true })
  textRight(page, fonts, `Order ${order.displayId}`, R_RIGHT, top - 44, { size: 11, bold: true, color: MUTED })
  let y = top - logoHeight - 18
  rule(page, R_LEFT, R_RIGHT, y)
  y -= 26

  // ── Ship to (left) and order details (right), side by side
  const colGap = 32
  const colW = (R_WIDTH - colGap) / 2
  const detailsLeft = R_LEFT + colW + colGap
  const blockTop = y

  text(page, fonts, "SHIP TO", R_LEFT, y, { size: 8, bold: true, color: MUTED })
  y -= 18
  const { name, lines } = addressLines(order)
  for (const l of wrapLines(fonts.bold, 12, name || order.email, colW, 2)) {
    text(page, fonts, l, R_LEFT, y, { size: 12, bold: true })
    y -= 16
  }
  for (const part of lines) {
    for (const l of wrapLines(fonts.body, 11, part, colW, 2)) {
      text(page, fonts, l, R_LEFT, y, { size: 11 })
      y -= 15
    }
  }
  const phone = order.shippingAddress?.phone
  if (phone) {
    text(page, fonts, phone, R_LEFT, y, { size: 10, color: MUTED })
    y -= 14
  }
  if (name) {
    text(page, fonts, order.email, R_LEFT, y, { size: 10, color: MUTED })
    y -= 14
  }
  const shipBottom = y

  y = blockTop
  text(page, fonts, "ORDER DETAILS", detailsLeft, y, { size: 8, bold: true, color: MUTED })
  y -= 18
  for (const [label, value] of [
    ["Order number", String(order.displayId)],
    ["Order date", formatDate(order.createdAt)],
    ["Payment", method],
    ["Status", paid ? "Paid" : order.status.charAt(0).toUpperCase() + order.status.slice(1)],
  ] as const) {
    text(page, fonts, label, detailsLeft, y, { size: 10, color: MUTED })
    textRight(page, fonts, value, R_RIGHT, y, { size: 10, bold: true })
    y -= 16
  }

  y = Math.min(shipBottom, y) - 18

  // ── Items. A long order runs onto further pages, with the table heading
  // repeated, rather than being cut short.
  const itemsHeading = () => {
    page.drawRectangle({ x: R_LEFT, y: y - 7, width: R_WIDTH, height: 22, color: SHADE })
    const hy = y
    text(page, fonts, "ITEM", R_LEFT + 8, hy, { size: 8, bold: true, color: MUTED })
    textRight(page, fonts, "QTY", COL_QTY, hy, { size: 8, bold: true, color: MUTED })
    textRight(page, fonts, "UNIT PRICE", COL_UNIT, hy, { size: 8, bold: true, color: MUTED })
    textRight(page, fonts, "AMOUNT", COL_AMOUNT, hy, { size: 8, bold: true, color: MUTED })
    y -= 28
  }
  const newPage = () => {
    page = doc.addPage([A4_W, A4_H])
    const h = 30
    page.drawImage(logo, { x: R_LEFT, y: top - h, width: (logo.width / logo.height) * h, height: h })
    textRight(page, fonts, `Receipt - Order ${order.displayId} (continued)`, R_RIGHT, top - 19, {
      size: 10,
      bold: true,
      color: MUTED,
    })
    y = top - h - 14
    rule(page, R_LEFT, R_RIGHT, y)
    y -= 26
  }
  const floor = R_MARGIN + R_FOOTER

  itemsHeading()
  for (const item of order.items) {
    const title = item.variantTitle ? `${item.productTitle} - ${item.variantTitle}` : item.productTitle
    const titleLines = wrapLines(fonts.body, 10, title, ITEM_WIDTH, 3)
    const height = titleLines.length * 13 + 12

    if (y - height < floor) {
      newPage()
      itemsHeading()
    }

    textRight(page, fonts, String(item.quantity), COL_QTY, y, { size: 10 })
    textRight(page, fonts, money(item.unitPriceCents), COL_UNIT, y, { size: 10 })
    textRight(page, fonts, money(item.unitPriceCents * item.quantity), COL_AMOUNT, y, { size: 10, bold: true })
    for (const l of titleLines) {
      text(page, fonts, l, R_LEFT + 8, y, { size: 10 })
      y -= 13
    }
    y -= 4
    rule(page, R_LEFT, R_RIGHT, y + 5, HAIRLINE, 0.75)
    y -= 8
  }

  // ── Totals, right-aligned under the table; on a fresh page if they would
  // run into the footer.
  if (y - TOTALS_HEIGHT < floor) newPage()
  const totalsLeft = R_RIGHT - 220
  y -= 6
  for (const [label, value] of [
    ["Subtotal", money(order.subtotalCents)],
    ["Shipping", order.shippingCents === 0 ? "Free" : money(order.shippingCents)],
  ] as const) {
    text(page, fonts, label, totalsLeft, y, { size: 10, color: MUTED })
    textRight(page, fonts, value, COL_AMOUNT, y, { size: 10 })
    y -= 18
  }
  rule(page, totalsLeft, R_RIGHT, y + 6)
  y -= 14
  text(page, fonts, paid ? "Total paid" : "Total", totalsLeft, y, { size: 13, bold: true })
  textRight(page, fonts, money(order.totalCents), COL_AMOUNT, y, { size: 13, bold: true })
  y -= 34
  text(page, fonts, "Thank you for your order.", R_LEFT, y, { size: 10, color: MUTED })

  const pages = doc.getPages()
  pages.forEach((p, i) => receiptFooter(p, fonts, i + 1, pages.length))

  return Buffer.from(await doc.save())
}
