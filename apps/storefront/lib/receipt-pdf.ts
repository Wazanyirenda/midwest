import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

/**
 * Receipt PDFs, drawn rather than rendered from HTML.
 *
 * A headless browser would give richer layout but cannot run on the serverless
 * functions this store deploys to. pdf-lib is pure JS with no native binary and
 * no font files to bundle — StandardFonts are built into every PDF reader — so
 * the same code works locally and in production.
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
const RULE = rgb(0.85, 0.84, 0.82)

const PAGE_W = 595.28 // A4 portrait, points
const PAGE_H = 841.89
const MARGIN = 56

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

type Ctx = { page: PDFPage; body: PDFFont; bold: PDFFont }

function text(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}
) {
  ctx.page.drawText(safe(value), {
    x,
    y,
    size: opts.size ?? 10,
    font: opts.bold ? ctx.bold : ctx.body,
    color: opts.color ?? INK,
  })
}

/** Right-aligns against a column edge, so the money column lines up. */
function textRight(
  ctx: Ctx,
  value: string,
  right: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}
) {
  const size = opts.size ?? 10
  const font = opts.bold ? ctx.bold : ctx.body
  const width = font.widthOfTextAtSize(safe(value), size)
  text(ctx, value, right - width, y, opts)
}

function rule(ctx: Ctx, y: number) {
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color: RULE,
  })
}

export async function buildReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Receipt — Order #${order.displayId}`)
  doc.setProducer("Midwestern Peptides")

  const page = doc.addPage([PAGE_W, PAGE_H])
  const ctx: Ctx = {
    page,
    body: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  const right = PAGE_W - MARGIN
  let y = PAGE_H - MARGIN

  // ── Header
  text(ctx, "MIDWESTERN PEPTIDES", MARGIN, y, { size: 15, bold: true })
  textRight(ctx, "RECEIPT", right, y, { size: 15, bold: true, color: MUTED })
  y -= 16
  text(ctx, "North Dakota, USA", MARGIN, y, { size: 9, color: MUTED })
  textRight(ctx, `Order #${order.displayId}`, right, y, { size: 9, color: MUTED })
  y -= 12
  text(ctx, "support@midwesternpeptides.com", MARGIN, y, { size: 9, color: MUTED })
  textRight(ctx, formatDate(order.createdAt), right, y, { size: 9, color: MUTED })

  y -= 22
  rule(ctx, y)
  y -= 26

  // ── Billed to / payment
  text(ctx, "BILLED TO", MARGIN, y, { size: 8, bold: true, color: MUTED })
  text(ctx, "PAYMENT", MARGIN + 280, y, { size: 8, bold: true, color: MUTED })
  y -= 15

  const a = order.shippingAddress
  const name = [a?.first_name, a?.last_name].filter(Boolean).join(" ")
  const lines = [
    name || order.email,
    a?.address_1 ?? "",
    a?.address_2 ?? "",
    [a?.city, a?.province, a?.postal_code].filter(Boolean).join(", "),
    name ? order.email : "",
  ].filter(Boolean)

  const provider =
    order.paymentProvider === "nowpayments"
      ? "Cryptocurrency"
      : order.paymentProvider === "stripe"
        ? "Card"
        : "—"
  const payment = [provider, `Status: ${order.status}`]

  const rows = Math.max(lines.length, payment.length)
  for (let i = 0; i < rows; i++) {
    if (lines[i]) text(ctx, lines[i]!, MARGIN, y, { size: 10 })
    if (payment[i]) text(ctx, payment[i]!, MARGIN + 280, y, { size: 10 })
    y -= 14
  }

  y -= 12
  rule(ctx, y)
  y -= 20

  // ── Items
  const qtyX = 330
  const priceRight = 450
  const totalRight = right

  text(ctx, "ITEM", MARGIN, y, { size: 8, bold: true, color: MUTED })
  text(ctx, "QTY", qtyX, y, { size: 8, bold: true, color: MUTED })
  textRight(ctx, "UNIT", priceRight, y, { size: 8, bold: true, color: MUTED })
  textRight(ctx, "AMOUNT", totalRight, y, { size: 8, bold: true, color: MUTED })
  y -= 8
  rule(ctx, y)
  y -= 18

  for (const item of order.items) {
    text(ctx, item.productTitle, MARGIN, y, { size: 10 })
    text(ctx, String(item.quantity), qtyX, y, { size: 10 })
    textRight(ctx, money(item.unitPriceCents), priceRight, y, { size: 10 })
    textRight(ctx, money(item.unitPriceCents * item.quantity), totalRight, y, { size: 10 })
    y -= 13

    if (item.variantTitle) {
      text(ctx, item.variantTitle, MARGIN + 10, y, { size: 9, color: MUTED })
      y -= 13
    }
    y -= 4
  }

  y -= 6
  rule(ctx, y)
  y -= 20

  // ── Totals
  for (const [label, value, bold] of [
    ["Subtotal", money(order.subtotalCents), false],
    ["Shipping", order.shippingCents === 0 ? "Free" : money(order.shippingCents), false],
  ] as const) {
    textRight(ctx, label, priceRight, y, { size: 10, color: MUTED })
    textRight(ctx, value, totalRight, y, { size: 10, bold })
    y -= 16
  }

  y -= 4
  textRight(ctx, "Total paid", priceRight, y, { size: 11, bold: true })
  textRight(ctx, money(order.totalCents), totalRight, y, { size: 11, bold: true })

  // ── Research-use footer, pinned to the bottom of the page
  const footY = MARGIN + 34
  rule(ctx, footY + 26)
  text(
    ctx,
    "All products are sold for laboratory research use only.",
    MARGIN,
    footY + 12,
    { size: 8, color: MUTED }
  )
  text(
    ctx,
    "Not for human or veterinary consumption. Midwestern Peptides LLC.",
    MARGIN,
    footY,
    { size: 8, color: MUTED }
  )

  return Buffer.from(await doc.save())
}
