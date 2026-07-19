import "server-only"
import { Resend } from "resend"
import { carrierTrackingUrl } from "@/lib/orders"

// Transactional email via Resend. Missing RESEND_API_KEY → sends no-op with a
// console warning; a failed send must NEVER fail checkout or a status update.

function fromAddress(): string {
  return process.env.RESEND_FROM ?? "Midwestern Peptides <orders@midwesternpeptides.com>"
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`)
    return
  }
  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({ from: fromAddress(), to, subject, html })
    if (error) console.error(`[email] send failed: ${error.message}`)
  } catch (e) {
    console.error("[email] send failed:", e)
  }
}

// Table-based layout for broad email-client compatibility.
function renderLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f5f4f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f4f0;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background-color:#0d0d0d;padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:bold;">Midwestern Peptides</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#1c1b18;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #ebe9e3;">
            <p style="margin:0;font-size:11px;color:#8f8b7f;line-height:1.5;">
              All products are sold for laboratory research use only. Not for human or veterinary use.<br/>
              Midwestern Peptides · orders@midwesternpeptides.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

type EmailOrderItem = {
  product_title: string
  variant_title?: string | null
  quantity: number
  unit_price_cents: number
}

export async function sendOrderConfirmationEmail(order: {
  id: string
  display_id: number
  email: string
  items: EmailOrderItem[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
}): Promise<void> {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:#514e48;">
          ${i.product_title}${i.variant_title ? ` — ${i.variant_title}` : ""} × ${i.quantity}
        </td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#1c1b18;font-weight:bold;">
          ${formatAmount(i.unit_price_cents * i.quantity)}
        </td>
      </tr>`
    )
    .join("")

  const body = `
    <p style="font-size:14px;color:#514e48;line-height:1.6;">
      Thanks for your order! We've received it and will start preparing it right away.
      You'll get another email with tracking once it ships.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ebe9e3;border-bottom:1px solid #ebe9e3;">
      ${rows}
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#8f8b7f;border-top:1px solid #ebe9e3;">Subtotal</td>
        <td align="right" style="padding:8px 0;font-size:13px;color:#8f8b7f;border-top:1px solid #ebe9e3;">${formatAmount(order.subtotal_cents)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#8f8b7f;">Shipping</td>
        <td align="right" style="padding:4px 0;font-size:13px;color:#8f8b7f;">${formatAmount(order.shipping_cents)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:15px;color:#1c1b18;font-weight:bold;">Total</td>
        <td align="right" style="padding:8px 0;font-size:15px;color:#1c1b18;font-weight:bold;">${formatAmount(order.total_cents)}</td>
      </tr>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${appUrl()}/account/orders/${order.id}"
         style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
        View your order
      </a>
    </p>`

  await send(order.email, `Order #${order.display_id} confirmed — Midwestern Peptides`, renderLayout(`Order #${order.display_id} confirmed`, body))
}

const STATUS_COPY: Record<string, { subject: string; body: string }> = {
  shipped: {
    subject: "Your order is on its way",
    body: "Good news — your order has shipped!",
  },
  delivered: {
    subject: "Your order was delivered",
    body: "Your order has been marked as delivered. We hope everything arrived in perfect condition.",
  },
  canceled: {
    subject: "Your order was canceled",
    body: "Your order has been canceled. If you were charged, the refund will arrive within 5–10 business days.",
  },
}

export async function sendOrderStatusEmail(order: {
  id: string
  display_id: number
  email: string
  status: string
  tracking_number?: string | null
  tracking_carrier?: string | null
}): Promise<void> {
  const copy = STATUS_COPY[order.status]
  if (!copy) return // only ship/deliver/cancel notify customers

  const trackingUrl = carrierTrackingUrl(
    order.tracking_carrier ?? null,
    order.tracking_number ?? null
  )

  const body = `
    <p style="font-size:14px;color:#514e48;line-height:1.6;">${copy.body}</p>
    ${
      order.status === "shipped" && order.tracking_number
        ? `<p style="font-size:14px;color:#514e48;line-height:1.6;">
             Tracking number: <strong>${order.tracking_number}</strong>
             ${order.tracking_carrier ? ` (${order.tracking_carrier.toUpperCase()})` : ""}
           </p>
           ${
             trackingUrl
               ? `<p style="margin:20px 0 0;">
                    <a href="${trackingUrl}"
                       style="display:inline-block;background-color:#16a34a;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
                      Track your shipment
                    </a>
                  </p>`
               : ""
           }`
        : ""
    }
    <p style="margin:24px 0 0;font-size:13px;">
      <a href="${appUrl()}/account/orders/${order.id}" style="color:#16a34a;">View order details</a>
    </p>`

  await send(order.email, `Order #${order.display_id}: ${copy.subject}`, renderLayout(copy.subject, body))
}
