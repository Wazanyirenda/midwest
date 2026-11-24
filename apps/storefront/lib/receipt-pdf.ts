import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { code128B } from "@/lib/code128"
import { RECEIPT_LOGO_PNG_BASE64 } from "@/lib/receipt-logo"

/**
 * Order PDFs: the receipt on A4, for the customer's email, their account
 * download and the store's copy (printed on the office printer and packed in
 * the box), and a 4x6 shipping label for the Zebra, for the outside of it.
 * Neither is a postage label: postage still comes from the carrier or a label
 * service.
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

/** An order as the database returns it, before it is shaped for a PDF. */
export type OrderPrintRow = {
  order_code: string
  email: string
  created_at?: string
  status?: string
  payment_provider?: string | null
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  shipping_address?: ReceiptOrder["shippingAddress"]
  items: Array<{
    product_title: string
    variant_title?: string | null
    quantity: number
    unit_price_cents: number
  }>
}

/** The return-address setting as label lines: one per line, blanks dropped. */
export function returnAddressLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
}

export function toReceiptOrder(row: OrderPrintRow): ReceiptOrder {
  return {
    displayId: row.order_code,
    createdAt: row.created_at ?? new Date().toISOString(),
    email: row.email,
    status: row.status ?? "paid",
    paymentProvider: row.payment_provider ?? null,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    shippingAddress: row.shipping_address ?? null,
    items: row.items.map((i) => ({
      productTitle: i.product_title,
      variantTitle: i.variant_title ?? null,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
    })),
  }
}

const INK = rgb(0.11, 0.106, 0.094)
const MUTED = rgb(0.3, 0.29, 0.27)
const HAIRLINE = rgb(0.66, 0.65, 0.63)
const SHADE = rgb(0.91, 0.905, 0.895)

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
  rule(page, R_LEFT, R_RIGHT, R_MARGIN + 38, HAIRLINE)
  text(page, fonts, "Questions? support@midwesternpeptides.com", R_LEFT, R_MARGIN + 22, { size: 9, bold: true })
  text(
    page,
    fonts,
    "For laboratory research use only. Not for human or veterinary consumption.",
    R_LEFT,
    R_MARGIN + 8,
    { size: 9, color: MUTED }
  )
  if (pages > 1) {
    textRight(page, fonts, `Page ${pageNo} of ${pages}`, R_RIGHT, R_MARGIN + 8, { size: 9, color: MUTED })
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
  textRight(page, fonts, `Order ${order.displayId}`, R_RIGHT, top - 46, { size: 12, bold: true, color: MUTED })
  let y = top - logoHeight - 18
  rule(page, R_LEFT, R_RIGHT, y)
  y -= 26

  // ── Ship to (left) and order details (right), side by side
  const colGap = 32
  const colW = (R_WIDTH - colGap) / 2
  const detailsLeft = R_LEFT + colW + colGap
  const blockTop = y

  text(page, fonts, "SHIP TO", R_LEFT, y, { size: 9, bold: true, color: MUTED })
  y -= 18
  const { name, lines } = addressLines(order)
  for (const l of wrapLines(fonts.bold, 13, name || order.email, colW, 2)) {
    text(page, fonts, l, R_LEFT, y, { size: 13, bold: true })
    y -= 17
  }
  for (const part of lines) {
    for (const l of wrapLines(fonts.body, 12, part, colW, 2)) {
      text(page, fonts, l, R_LEFT, y, { size: 12 })
      y -= 16
    }
  }
  const phone = order.shippingAddress?.phone
  if (phone) {
    text(page, fonts, phone, R_LEFT, y, { size: 11, color: MUTED })
    y -= 15
  }
  if (name) {
    text(page, fonts, order.email, R_LEFT, y, { size: 11, color: MUTED })
    y -= 15
  }
  const shipBottom = y

  y = blockTop
  text(page, fonts, "ORDER DETAILS", detailsLeft, y, { size: 9, bold: true, color: MUTED })
  y -= 18
  for (const [label, value] of [
    ["Order number", String(order.displayId)],
    ["Order date", formatDate(order.createdAt)],
    ["Payment", method],
    ["Status", paid ? "Paid" : order.status.charAt(0).toUpperCase() + order.status.slice(1)],
  ] as const) {
    text(page, fonts, label, detailsLeft, y, { size: 11, color: MUTED })
    textRight(page, fonts, value, R_RIGHT, y, { size: 11, bold: true })
    y -= 17
  }

  y = Math.min(shipBottom, y) - 18

  // ── Items. A long order runs onto further pages, with the table heading
  // repeated, rather than being cut short.
  const itemsHeading = () => {
    page.drawRectangle({ x: R_LEFT, y: y - 7, width: R_WIDTH, height: 22, color: SHADE })
    const hy = y
    text(page, fonts, "ITEM", R_LEFT + 8, hy, { size: 9, bold: true, color: MUTED })
    textRight(page, fonts, "QTY", COL_QTY, hy, { size: 9, bold: true, color: MUTED })
    textRight(page, fonts, "UNIT PRICE", COL_UNIT, hy, { size: 9, bold: true, color: MUTED })
    textRight(page, fonts, "AMOUNT", COL_AMOUNT, hy, { size: 9, bold: true, color: MUTED })
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
    const titleLines = wrapLines(fonts.body, 11, title, ITEM_WIDTH, 3)
    const height = titleLines.length * 14 + 12

    if (y - height < floor) {
      newPage()
      itemsHeading()
    }

    textRight(page, fonts, String(item.quantity), COL_QTY, y, { size: 11 })
    textRight(page, fonts, money(item.unitPriceCents), COL_UNIT, y, { size: 11 })
    textRight(page, fonts, money(item.unitPriceCents * item.quantity), COL_AMOUNT, y, { size: 11, bold: true })
    for (const l of titleLines) {
      text(page, fonts, l, R_LEFT + 8, y, { size: 11 })
      y -= 14
    }
    y -= 4
    rule(page, R_LEFT, R_RIGHT, y + 5, HAIRLINE)
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
    text(page, fonts, label, totalsLeft, y, { size: 11, color: MUTED })
    textRight(page, fonts, value, COL_AMOUNT, y, { size: 11 })
    y -= 18
  }
  rule(page, totalsLeft, R_RIGHT, y + 6)
  y -= 14
  text(page, fonts, paid ? "Total paid" : "Total", totalsLeft, y, { size: 14, bold: true })
  textRight(page, fonts, money(order.totalCents), COL_AMOUNT, y, { size: 14, bold: true })
  y -= 34
  text(page, fonts, "Thank you for your order.", R_LEFT, y, { size: 11, color: MUTED })

  const pages = doc.getPages()
  pages.forEach((p, i) => receiptFooter(p, fonts, i + 1, pages.length))

  return Buffer.from(await doc.save())
}

// ─── 4x6 shipping label ──────────────────────────────────────────────────────
// For the outside of the box: who it's from, who it's for and the order
// number. No items or prices — the receipt goes inside, where carriers and
// anyone on a porch can't read what the parcel holds or what it's worth. It is
// not a postage label; a label bought from USPS or a label service replaces it.

const LABEL_W = 288 // 4 in at 72 pt/in
const LABEL_H = 432 // 6 in
// Wider than the printer needs, so nothing sits near an edge that a
// slightly skewed roll could clip.
const L_MARGIN = 26
const L_RIGHT = LABEL_W - L_MARGIN
const L_WIDTH = L_RIGHT - L_MARGIN

// 1.44 pt is exactly 6 dots on the Zebra's 300 dpi head, so every bar prints
// at a whole number of dots and the barcode stays scannable.
const BARCODE_MODULE = 1.44
const BARCODE_HEIGHT = 46

export async function buildShippingLabelPdf(order: ReceiptOrder, returnAddress: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Shipping label - Order ${order.displayId}`)
  doc.setProducer("Midwestern Peptides")
  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  const logo = await doc.embedPng(Buffer.from(RECEIPT_LOGO_PNG_BASE64, "base64"))
  const page = doc.addPage([LABEL_W, LABEL_H])
  const top = LABEL_H - L_MARGIN

  // ── Logo, with the order number and date beside it
  const logoHeight = 42
  page.drawImage(logo, {
    x: L_MARGIN,
    y: top - logoHeight,
    width: (logo.width / logo.height) * logoHeight,
    height: logoHeight,
  })
  textRight(page, fonts, `Order ${order.displayId}`, L_RIGHT, top - 16, { size: 10, bold: true })
  textRight(page, fonts, formatDate(order.createdAt), L_RIGHT, top - 28, { size: 8, color: MUTED })
  let y = top - logoHeight - 8
  rule(page, L_MARGIN, L_RIGHT, y)

  // ── From: the return address, small. Left out entirely until one is set in
  // admin, rather than printing a made-up address.
  if (returnAddress.length > 0) {
    y -= 14
    text(page, fonts, "FROM", L_MARGIN, y, { size: 7, bold: true, color: MUTED })
    y -= 12
    for (const line of returnAddress.slice(0, 4)) {
      for (const l of wrapLines(fonts.body, 9, line, L_WIDTH, 1)) {
        text(page, fonts, l, L_MARGIN, y, { size: 9 })
        y -= 11
      }
    }
    y -= 4
    rule(page, L_MARGIN, L_RIGHT, y)
  }
  const spaceTop = y

  // ── The order number as a barcode, raised well clear of the bottom edge
  const widths = code128B(String(order.displayId))
  const barcodeWidth = widths.reduce((sum, w) => sum + w, 0) * BARCODE_MODULE
  let x = (LABEL_W - barcodeWidth) / 2
  const barY = L_MARGIN + 40
  const spaceBottom = barY + BARCODE_HEIGHT + 14
  rule(page, L_MARGIN, L_RIGHT, spaceBottom)
  widths.forEach((w, i) => {
    if (i % 2 === 0) {
      page.drawRectangle({ x, y: barY, width: w * BARCODE_MODULE, height: BARCODE_HEIGHT, color: rgb(0, 0, 0) })
    }
    x += w * BARCODE_MODULE
  })
  const caption = String(order.displayId)
  text(page, fonts, caption, (LABEL_W - fonts.bold.widthOfTextAtSize(safe(caption), 10)) / 2, barY - 15, {
    size: 10,
    bold: true,
  })

  // ── Ship to: as large as fits, since this is what the carrier reads, and
  // centred in the space between the return address and the barcode
  const { name, lines } = addressLines(order)
  const rows: Array<{ value: string; size: number; bold: boolean; step: number; muted?: boolean }> = [
    { value: "SHIP TO", size: 8, bold: true, step: 24, muted: true },
    ...wrapLines(fonts.bold, 20, name || order.email, L_WIDTH, 2).map((value) => ({
      value,
      size: 20,
      bold: true,
      step: 24,
    })),
    ...lines.flatMap((part) =>
      wrapLines(fonts.bold, 16, part, L_WIDTH, 2).map((value) => ({ value, size: 16, bold: true, step: 20 }))
    ),
  ]
  const phone = order.shippingAddress?.phone
  if (phone) rows.push({ value: phone, size: 10, bold: false, step: 14, muted: true })
  // Glyphs rise about 0.75 of the font size above the baseline and drop about
  // 0.2 below it; measure the block on that, not on line steps alone.
  const first = rows[0]!
  const last = rows[rows.length - 1]!
  const blockHeight = 0.75 * first.size + rows.slice(0, -1).reduce((sum, r) => sum + r.step, 0) + 0.2 * last.size
  const slack = Math.max(spaceTop - spaceBottom - blockHeight, 12)
  y = spaceTop - slack / 2 - 0.75 * first.size
  // The lines stay left-aligned, as carriers expect, but the block as a whole
  // sits in the middle of the label.
  const blockWidth = Math.max(
    ...rows.map((r) => (r.bold ? fonts.bold : fonts.body).widthOfTextAtSize(safe(r.value), r.size))
  )
  const blockX = Math.max(L_MARGIN, (LABEL_W - blockWidth) / 2)
  for (const row of rows) {
    text(page, fonts, row.value, blockX, y, { size: row.size, bold: row.bold, color: row.muted ? MUTED : INK })
    y -= row.step
  }

  return Buffer.from(await doc.save())
}
