import "server-only"
import { carrierTrackingUrl } from "@/lib/orders"
import { deliver } from "@/lib/email-transport"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSiteSettings } from "@/lib/settings"

// Templates and the consent gate. Delivery itself is in lib/email-transport.ts,
// which picks SMTP or Resend from the environment. A failed send must NEVER
// fail checkout or a status update — every path here logs and returns.

function fromAddress(): string {
  // RESEND_FROM kept as a fallback so existing deployments don't break.
  return (
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM ??
    "Midwestern Peptides <orders@midwesternpeptides.com>"
  )
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export type EmailCategory = "transactional" | "marketing"

type SendOptions = {
  category: EmailCategory
  /** Stable template name — used for the send log and dedupe. */
  template: string
  /** What this mail is about: an order id, cart id, campaign id. */
  entityId?: string
  /** Appended to marketing mail; required for CAN-SPAM. */
  unsubscribeToken?: string
}

/**
 * The single choke point for outbound mail.
 *
 * Consent is checked HERE rather than at each call site, so a new marketing
 * template cannot skip it by forgetting. Transactional mail (receipts, password
 * resets) is exempt by law and by design; everything else needs recorded
 * opt-in via may_email_marketing().
 */
async function send(
  to: string,
  subject: string,
  html: string,
  options: SendOptions
): Promise<void> {
  const { category, template, entityId, unsubscribeToken } = options

  if (category === "marketing") {
    const { data: allowed, error } = await supabaseAdmin.rpc("may_email_marketing", {
      p_email: to,
    })
    // Fail closed: if consent can't be confirmed, don't send.
    if (error || !allowed) {
      await logEmail({
        to,
        template,
        category,
        entityId,
        subject,
        status: "suppressed",
        error: error?.message ?? "no marketing consent on record",
      })
      return
    }
    html = await appendUnsubscribeFooter(html, to, unsubscribeToken)

    // Daily cap is a blast-radius limit: a mistake in a campaign, or a runaway
    // job, stops at a number the owner set rather than the whole list.
    const { marketingDailyCap } = await getSiteSettings()
    const since = new Date()
    since.setUTCHours(0, 0, 0, 0)
    const { count } = await supabaseAdmin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("category", "marketing")
      .eq("status", "sent")
      .gte("sent_at", since.toISOString())

    if ((count ?? 0) >= marketingDailyCap) {
      await logEmail({
        to, template, category, entityId, subject,
        status: "suppressed",
        error: `daily marketing cap of ${marketingDailyCap} reached`,
      })
      return
    }
  }

  const headers =
    category === "marketing" && unsubscribeToken
      ? {
          // One-click unsubscribe — Gmail/Yahoo bulk rules expect these.
          "List-Unsubscribe": `<${appUrl()}/unsubscribe?token=${unsubscribeToken}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined

  const marketingTransport =
    category === "marketing"
      ? (await getSiteSettings()).marketingTransport
      : "same"

  const result = await deliver({
    from: fromAddress(),
    to,
    subject,
    html,
    headers,
    prefer: marketingTransport === "resend" ? "resend" : undefined,
  })

  if (!result.ok) {
    // Transport errors carry host names and usernames — log them, never show them.
    console.error(`[email] send failed: ${result.error}`)
    await logEmail({
      to, template, category, entityId, subject,
      status: "failed", error: result.error,
    })
    return
  }

  await logEmail({ to, template, category, entityId, subject, status: "sent" })
}

/** Logging must never throw — a log failure can't be allowed to break a send. */
async function logEmail(entry: {
  to: string
  template: string
  category: EmailCategory
  entityId?: string
  subject: string
  status: "sent" | "failed" | "suppressed"
  error?: string
}): Promise<void> {
  try {
    await supabaseAdmin.from("email_log").insert({
      to_email: entry.to,
      template: entry.template,
      category: entry.category,
      entity_id: entry.entityId ?? null,
      subject: entry.subject,
      status: entry.status,
      error: entry.error ?? null,
    })
  } catch (e) {
    console.error("[email] could not write send log:", e)
  }
}

/** CAN-SPAM: promotional mail needs an unsubscribe link and a postal address. */
async function appendUnsubscribeFooter(
  html: string,
  to: string,
  token?: string
): Promise<string> {
  const { businessPostalAddress } = await getSiteSettings()
  const link = token
    ? `${appUrl()}/unsubscribe?token=${token}`
    : `${appUrl()}/unsubscribe?email=${encodeURIComponent(to)}`

  return html.replace(
    "</body>",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:0 0 24px;">
        <p style="margin:0;font-size:11px;color:#8f8b7f;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
          You're receiving this because you opted in to updates from Midwestern Peptides.<br/>
          <a href="${link}" style="color:#6b6760;">Unsubscribe</a>${
            businessPostalAddress ? ` · ${businessPostalAddress}` : ""
          }
        </p>
      </td></tr>
    </table></body>`
  )
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

  await send(
    order.email,
    `Order #${order.display_id} confirmed — Midwestern Peptides`,
    renderLayout(`Order #${order.display_id} confirmed`, body),
    { category: "transactional", template: "order_confirmation", entityId: order.id }
  )
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

  await send(
    order.email,
    `Order #${order.display_id}: ${copy.subject}`,
    renderLayout(copy.subject, body),
    { category: "transactional", template: `order_${order.status}`, entityId: order.id }
  )
}


// ─── Marketing ────────────────────────────────────────────────────────────────
// Everything below is category "marketing": send() checks consent and appends
// the unsubscribe footer. Never reclassify these as transactional to reach more
// people — that is exactly what CAN-SPAM prohibits.

export async function sendAbandonedCartEmail(input: {
  email: string
  cartId: string
  unsubscribeToken?: string
  items: EmailOrderItem[]
  total_cents: number
}): Promise<void> {
  const rows = input.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:#514e48;">
          ${i.product_title}${i.variant_title ? ` — ${i.variant_title}` : ""}
          <span style="color:#8f8b7f;"> × ${i.quantity}</span>
        </td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#1c1b18;">
          ${formatAmount(i.unit_price_cents * i.quantity)}
        </td>
      </tr>`
    )
    .join("")

  const body = `
    <p style="font-size:14px;color:#514e48;line-height:1.6;">
      You left these in your cart. They're still here whenever you're ready.
    </p>
    <table role="presentation" width="100%" style="margin:16px 0;border-top:1px solid #ebe9e3;">
      ${rows}
      <tr><td style="padding:12px 0 0;border-top:1px solid #ebe9e3;font-size:14px;font-weight:bold;color:#1c1b18;">Total</td>
        <td align="right" style="padding:12px 0 0;border-top:1px solid #ebe9e3;font-size:14px;font-weight:bold;color:#1c1b18;">
          ${formatAmount(input.total_cents)}</td></tr>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${appUrl()}/cart" style="background-color:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">
        Return to cart
      </a>
    </p>`

  await send(input.email, "You left something in your cart", renderLayout("Still interested?", body), {
    category: "marketing",
    template: "abandoned_cart",
    entityId: input.cartId,
    unsubscribeToken: input.unsubscribeToken,
  })
}

export async function sendCampaignEmail(input: {
  email: string
  campaignId: string
  subject: string
  bodyHtml: string
  unsubscribeToken?: string
}): Promise<void> {
  await send(input.email, input.subject, renderLayout(input.subject, input.bodyHtml), {
    category: "marketing",
    template: "campaign",
    entityId: input.campaignId,
    unsubscribeToken: input.unsubscribeToken,
  })
}
