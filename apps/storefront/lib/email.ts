import "server-only"
import { carrierTrackingUrl } from "@/lib/orders"
import { deliver, mailboxFrom, type Mailbox } from "@/lib/email-transport"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSiteSettings } from "@/lib/settings"
import { buildReceiptPdf, type ReceiptOrder } from "@/lib/receipt-pdf"
import {
  assetLabel,
  explorerUrl,
  formatCryptoAmount,
  networkLabel,
} from "@/lib/crypto-assets"

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
  /** Which mailbox sends. Order mail goes from orders@ so replies land there. */
  mailbox?: Mailbox
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
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
    from: options.mailbox ? mailboxFrom(options.mailbox) : fromAddress(),
    to,
    subject,
    html,
    headers,
    prefer: marketingTransport === "resend" ? "resend" : undefined,
    mailbox: options.mailbox,
    attachments: options.attachments,
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

/**
 * Owner-written copy goes into an HTML email, so it is escaped rather than
 * trusted. The settings row is admin-only, but "admin-only" is not "safe to
 * inject" — a stray angle bracket would silently break every client's rendering.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Substitutes {{placeholders}} and drops any the caller did not supply. */
function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? "")
}

/** Owner copy → paragraphs. Blank lines separate them, as in the disclaimer. */
function copyToParagraphs(text: string, vars: Record<string, string> = {}): string {
  return fillTemplate(text, vars)
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map(
      (para) =>
        `<p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">${escapeHtml(
          para
        ).replace(/\n/g, "<br/>")}</p>`
    )
    .join("")
}

/** Subject lines are plain text — escaping here would show &amp; in the inbox. */
function subjectLine(text: string, vars: Record<string, string> = {}): string {
  return fillTemplate(text, vars)
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

type ReceiptEmailOrder = {
  id: string
  order_code: string
  email: string
  items: EmailOrderItem[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  created_at?: string
  status?: string
  payment_provider?: string | null
  shipping_address?: ReceiptOrder["shippingAddress"]
}

type Attachment = { filename: string; content: Buffer; contentType: string }

/**
 * The PDF receipt as an attachment. Generated per send and never stored —
 * regenerating it is cheap, and a PDF of someone's address is not something to
 * keep lying around. Undefined when it fails to draw, so the email still goes.
 */
async function receiptAttachments(order: ReceiptEmailOrder): Promise<Attachment[] | undefined> {
  try {
    const pdf = await buildReceiptPdf({
      displayId: order.order_code,
      createdAt: order.created_at ?? new Date().toISOString(),
      email: order.email,
      status: order.status ?? "paid",
      paymentProvider: order.payment_provider ?? null,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      shippingAddress: order.shipping_address ?? null,
      items: order.items.map((i) => ({
        productTitle: i.product_title,
        variantTitle: i.variant_title ?? null,
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
      })),
    })
    return [{ filename: `receipt-${order.order_code}.pdf`, content: pdf, contentType: "application/pdf" }]
  } catch (e) {
    console.error("[email] receipt PDF failed:", e)
    return undefined
  }
}

/** Itemised lines plus subtotal, shipping and total, for order emails. */
function orderTableHtml(order: {
  items: EmailOrderItem[]
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
}): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:#514e48;">
          ${escapeHtml(i.product_title)}${i.variant_title ? ` — ${escapeHtml(i.variant_title)}` : ""} × ${i.quantity}
        </td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#1c1b18;font-weight:bold;">
          ${formatAmount(i.unit_price_cents * i.quantity)}
        </td>
      </tr>`
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #ebe9e3;border-bottom:1px solid #ebe9e3;">
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
    </table>`
}

function buttonHtml(href: string, label: string): string {
  return `<p style="margin:24px 0 0;">
      <a href="${href}"
         style="display:inline-block;background-color:#1d6ad4;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
        ${label}
      </a>
    </p>`
}

function paragraph(html: string): string {
  return `<p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">${html}</p>`
}

export async function sendOrderConfirmationEmail(order: ReceiptEmailOrder): Promise<void> {
  const settings = await getSiteSettings()
  const vars = { order_number: order.order_code }

  const body = `
    ${copyToParagraphs(settings.emailOrderConfirmationBody, vars)}
    ${orderTableHtml(order)}
    ${buttonHtml(`${appUrl()}/account/orders/${order.id}`, "View your order")}`

  const attachments = await receiptAttachments(order)

  await send(
    order.email,
    subjectLine(settings.emailOrderConfirmationSubject, vars),
    renderLayout(subjectLine(settings.emailOrderConfirmationHeading, vars), body),
    {
      category: "transactional",
      template: "order_confirmation",
      entityId: order.id,
      mailbox: "orders",
      attachments,
    }
  )
}

// ─── Manual crypto payments ──────────────────────────────────────────────────
// The customer pays from their own wallet and staff approve by hand, so both
// sides are told at each step: order placed, payment submitted, approved or
// canceled.

export type ManualPaymentDetails = {
  payment_asset: string | null
  payment_network: string | null
  payment_address: string | null
  payment_amount_crypto: number | string | null
}

export type ManualEmailOrder = ReceiptEmailOrder &
  ManualPaymentDetails & {
    customer_name?: string | null
  }

function cryptoAmountText(order: ManualPaymentDetails): string {
  if (order.payment_amount_crypto == null) return ""
  return `${formatCryptoAmount(order.payment_amount_crypto, order.payment_asset ?? "")} ${
    order.payment_asset ?? ""
  }`
}

/** A label/value table on a tinted panel. Every value is escaped. */
function detailsPanelHtml(rows: Array<[label: string, value: string, mono?: boolean]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f5f4f0;border-radius:8px;">
      <tr><td style="padding:12px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows
            .map(
              ([label, value, mono]) => `<tr>
            <td style="padding:5px 12px 5px 0;font-size:13px;color:#8f8b7f;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
            <td style="padding:5px 0;font-size:14px;color:#1c1b18;font-weight:bold;word-break:break-all;${
              mono ? "font-family:Consolas,Menlo,monospace;font-size:13px;" : ""
            }">${escapeHtml(value)}</td>
          </tr>`
            )
            .join("")}
        </table>
      </td></tr>
    </table>`
}

/** Customer: order placed, here is how to pay. */
export async function sendOrderReceivedEmail(order: ManualEmailOrder): Promise<void> {
  const settings = await getSiteSettings()
  const vars = {
    order_number: order.order_code,
    cancel_hours: String(settings.unpaidOrderCancelHours),
  }

  const body = `
    ${copyToParagraphs(settings.emailOrderReceivedBody, vars)}
    ${detailsPanelHtml([
      ["Send exactly", cryptoAmountText(order)],
      ["Coin", assetLabel(order.payment_asset)],
      ["Network", networkLabel(order.payment_network)],
      ["To address", order.payment_address ?? "", true],
      ["Order", order.order_code, true],
    ])}
    ${paragraph(
      `<strong>Send only ${escapeHtml(order.payment_asset ?? "")} on the ${escapeHtml(
        networkLabel(order.payment_network)
      )} network to this address.</strong> Coins sent on another network, or to a mistyped address, cannot be recovered.`
    )}
    ${
      order.payment_asset === "BTC"
        ? paragraph(
            `This Bitcoin amount is held for ${settings.btcQuoteMinutes} minutes. If you pay later than that, open your order first for an updated amount.`
          )
        : ""
    }
    ${orderTableHtml(order)}
    ${buttonHtml(`${appUrl()}/account/orders/${order.id}`, "I've paid: add my transaction ID")}`

  await send(
    order.email,
    subjectLine(settings.emailOrderReceivedSubject, vars),
    renderLayout(subjectLine(settings.emailOrderReceivedHeading, vars), body),
    {
      category: "transactional",
      template: "order_received",
      entityId: order.id,
      mailbox: "orders",
    }
  )
}

/** A comma-separated address list, split, lower-cased and de-duplicated. */
export function splitEmailList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
}

async function sendToStaff(
  subject: string,
  heading: string,
  body: string,
  options: {
    template: string
    entityId: string
    attachments?: Attachment[]
    /** Overrides the order-alert setting, for when that setting is what changed. */
    recipients?: string[]
  }
): Promise<void> {
  const { recipients, ...sendOptions } = options
  const to = recipients ?? splitEmailList((await getSiteSettings()).orderAlertEmails)
  for (const address of to) {
    await send(address, subject, renderLayout(heading, body), {
      category: "transactional",
      mailbox: "orders",
      ...sendOptions,
    })
  }
}

/** Name, email and ship-to. Only ever sent to the store's own inboxes. */
function customerBlockHtml(order: ManualEmailOrder): string {
  const a = order.shipping_address
  const lines = a
    ? [
        `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(),
        a.address_1,
        a.address_2,
        `${a.city ?? ""}, ${a.province ?? ""} ${a.postal_code ?? ""}`.trim(),
      ].filter((line): line is string => !!line)
    : []
  return paragraph(
    `<strong>${escapeHtml(order.customer_name || "Customer")}</strong> · ${escapeHtml(order.email)}${
      lines.length ? `<br/>${lines.map(escapeHtml).join("<br/>")}` : ""
    }`
  )
}

function adminOrderLink(order: { order_code: string }): string {
  return `${appUrl()}/admin/orders?q=${encodeURIComponent(order.order_code)}`
}

/** Staff: a new order is waiting for payment. */
export async function sendNewOrderAlert(order: ManualEmailOrder): Promise<void> {
  const body = `
    ${paragraph(
      "A new order was placed and is <strong>waiting for payment</strong>. Nothing to do yet: you'll get another email when the customer submits their transaction ID."
    )}
    ${customerBlockHtml(order)}
    ${paragraph(
      `Expecting <strong>${escapeHtml(cryptoAmountText(order))}</strong> on ${escapeHtml(
        networkLabel(order.payment_network)
      )}.`
    )}
    ${orderTableHtml(order)}
    ${buttonHtml(adminOrderLink(order), "Open the order")}`

  await sendToStaff(
    `New order ${order.order_code}: ${formatAmount(order.total_cents)} (${order.payment_asset ?? "crypto"})`,
    `New order ${order.order_code}`,
    body,
    { template: "staff_new_order", entityId: order.id }
  )
}

/** Staff: the customer says they've paid. Check the blockchain and approve. */
export async function sendPaymentSubmittedAlert(
  order: ManualEmailOrder & { payment_txid: string }
): Promise<void> {
  const link = explorerUrl(order.payment_network, order.payment_txid)
  const body = `
    ${paragraph(
      `The customer for order <strong>${escapeHtml(order.order_code)}</strong> says they've paid. Check the transaction, then approve or reject the order.`
    )}
    ${customerBlockHtml(order)}
    ${detailsPanelHtml([
      ["Should receive", `${cryptoAmountText(order)} (${formatAmount(order.total_cents)})`],
      ["Network", networkLabel(order.payment_network)],
      ["To address", order.payment_address ?? "", true],
      ["Transaction ID", order.payment_txid, true],
    ])}
    ${paragraph(
      "On the explorer, confirm it went <strong>to the address above</strong>, the amount is right, and it is confirmed. A customer can paste any transaction ID; only the blockchain shows it was theirs and was paid to you."
    )}
    ${
      link
        ? `<p style="margin:0 0 8px;"><a href="${link}" style="color:#1d6ad4;font-size:14px;">View the transaction on the blockchain</a></p>`
        : ""
    }
    ${buttonHtml(adminOrderLink(order), "Approve or reject")}`

  await sendToStaff(
    `Payment submitted for ${order.order_code}: check and approve`,
    `Payment to check: ${order.order_code}`,
    body,
    { template: "staff_payment_submitted", entityId: order.id }
  )
}

/** Staff: a copy of the paid receipt, for the store's records. */
export async function sendPaidReceiptCopy(order: ManualEmailOrder): Promise<void> {
  const body = `
    ${paragraph(
      `Order <strong>${escapeHtml(order.order_code)}</strong> was approved as paid. The receipt is attached, and the customer has been sent the same one.`
    )}
    ${customerBlockHtml(order)}
    ${orderTableHtml(order)}
    ${buttonHtml(adminOrderLink(order), "Open the order")}`

  await sendToStaff(
    `Paid: order ${order.order_code}, ${formatAmount(order.total_cents)}`,
    `Order ${order.order_code} paid`,
    body,
    { template: "staff_receipt_copy", entityId: order.id, attachments: await receiptAttachments(order) }
  )
}

/** Customer: an unpaid order was canceled, or a payment couldn't be verified. */
export async function sendOrderCanceledEmail(order: {
  id: string
  order_code: string
  email: string
  kind: "unpaid" | "rejected"
  cancelHours?: number
  reason?: string | null
}): Promise<void> {
  const code = escapeHtml(order.order_code)
  const body =
    order.kind === "unpaid"
      ? `${paragraph(
          `Order <strong>${code}</strong> was canceled because we didn't receive a payment for it within ${
            order.cancelHours ?? 48
          } hours.`
        )}
         ${paragraph(
           "If you did send a payment, reply to this email with your transaction ID and we'll sort it out. Otherwise you're welcome to place a new order at any time."
         )}`
      : `${paragraph(`We couldn't verify the payment for order <strong>${code}</strong>, so it has been canceled.`)}
         ${order.reason ? paragraph(`Reason: ${escapeHtml(order.reason)}`) : ""}
         ${paragraph(
           "If you think this is a mistake, reply to this email with your transaction ID and we'll look into it straight away."
         )}`

  await send(order.email, `Order ${order.order_code} was canceled`, renderLayout("Your order was canceled", body), {
    category: "transactional",
    template: order.kind === "unpaid" ? "order_canceled_unpaid" : "order_canceled_rejected",
    entityId: order.id,
    mailbox: "orders",
  })
}

/**
 * Staff: a wallet address, its network, or the alert list itself changed.
 * Anyone who got into an admin account could swap in their own address and
 * collect every payment after it, so every change is announced with the old
 * value kept. A change to the alert list goes to the old AND new addresses —
 * otherwise removing the owner's email first would make the swap silent.
 */
export async function sendPaymentAddressChangedAlert(change: {
  label: string
  previous: string
  next: string
  changedBy: string
  recipients?: string[]
}): Promise<void> {
  const settings = await getSiteSettings()
  const body = `
    ${paragraph(
      `The <strong>${escapeHtml(change.label)}</strong> was changed in settings by ${escapeHtml(change.changedBy)}.`
    )}
    ${detailsPanelHtml([
      ["Before", change.previous || "(empty)", true],
      ["After", change.next || "(empty)", true],
    ])}
    ${paragraph(
      "<strong>If you didn't make this change, act now:</strong> turn off crypto payments in settings, change your password, and check who has admin access, then put the old value back."
    )}
    ${buttonHtml(`${appUrl()}/admin/settings`, "Open settings")}`

  await sendToStaff(`Security: ${change.label} was changed`, "A payment setting was changed", body, {
    template: "staff_address_changed",
    entityId: change.label,
    // Both alert lists: a security alert should reach everyone who gets any
    // alert, whichever box the owner happened to fill in.
    recipients: [
      ...new Set([
        ...(change.recipients ?? splitEmailList(settings.orderAlertEmails)),
        ...splitEmailList(settings.printAlertEmail),
      ]),
    ],
  })
}

/**
 * Sent once, when the account is created.
 *
 * It deliberately contains no password: Supabase stores only a hash, so the
 * plaintext does not exist to send, and mailing one would leave a permanent
 * credential in an inbox. Confirming the address and resetting a password both
 * go through the signed links in lib/email-auth.ts.
 */
export async function sendWelcomeEmail(input: {
  email: string
  firstName?: string | null
}): Promise<void> {
  const settings = await getSiteSettings()
  const vars = { customer_name: input.firstName?.trim() || "there" }

  const body = `
    ${copyToParagraphs(settings.emailWelcomeBody, vars)}
    <p style="margin:24px 0 0;">
      <a href="${appUrl()}/account"
         style="display:inline-block;background-color:#1d6ad4;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
        Go to your account
      </a>
    </p>`

  await send(
    input.email,
    subjectLine(settings.emailWelcomeSubject, vars),
    renderLayout(subjectLine(settings.emailWelcomeHeading, vars), body),
    { category: "transactional", template: "welcome", mailbox: "support" }
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
  order_code: string
  email: string
  status: string
  tracking_number?: string | null
  tracking_carrier?: string | null
}): Promise<void> {
  const copy = STATUS_COPY[order.status]
  if (!copy) return // only ship/deliver/cancel notify customers

  const settings = await getSiteSettings()
  const vars = { order_number: order.order_code }
  // Shipped is the one customers read most, so it is the one made editable.
  const shipped = order.status === "shipped"

  const trackingUrl = carrierTrackingUrl(
    order.tracking_carrier ?? null,
    order.tracking_number ?? null
  )

  const body = `
    ${
      shipped
        ? copyToParagraphs(settings.emailOrderShippedBody, vars)
        : `<p style="font-size:14px;color:#514e48;line-height:1.6;">${copy.body}</p>`
    }
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
                       style="display:inline-block;background-color:#1d6ad4;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
                      Track your shipment
                    </a>
                  </p>`
               : ""
           }`
        : ""
    }
    <p style="margin:24px 0 0;font-size:13px;">
      <a href="${appUrl()}/account/orders/${order.id}" style="color:#1d6ad4;">View order details</a>
    </p>`

  await send(
    order.email,
    shipped
      ? subjectLine(settings.emailOrderShippedSubject, vars)
      : `Order ${order.order_code}: ${copy.subject}`,
    renderLayout(
      shipped ? subjectLine(settings.emailOrderShippedHeading, vars) : copy.subject,
      body
    ),
    {
      category: "transactional",
      template: `order_${order.status}`,
      entityId: order.id,
      mailbox: "orders",
    }
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

  const settings = await getSiteSettings()

  const body = `
    ${copyToParagraphs(settings.emailAbandonedCartBody)}
    <table role="presentation" width="100%" style="margin:16px 0;border-top:1px solid #ebe9e3;">
      ${rows}
      <tr><td style="padding:12px 0 0;border-top:1px solid #ebe9e3;font-size:14px;font-weight:bold;color:#1c1b18;">Total</td>
        <td align="right" style="padding:12px 0 0;border-top:1px solid #ebe9e3;font-size:14px;font-weight:bold;color:#1c1b18;">
          ${formatAmount(input.total_cents)}</td></tr>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${appUrl()}/cart" style="background-color:#1d6ad4;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">
        Return to cart
      </a>
    </p>`

  await send(
    input.email,
    subjectLine(settings.emailAbandonedCartSubject),
    renderLayout(subjectLine(settings.emailAbandonedCartHeading), body),
    {
      category: "marketing",
      template: "abandoned_cart",
      entityId: input.cartId,
      unsubscribeToken: input.unsubscribeToken,
    }
  )
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

// One "printing is offline" email an hour at most. Orders keep arriving while
// the shop PC is asleep, and an alert per order would bury the inbox.
const PRINT_OFFLINE_ALERT_GAP_MS = 60 * 60 * 1000

/**
 * Tells the owner a paid order's receipt is not printing. Goes to the address
 * in the print_alert_email setting and nowhere else; empty means alerts are
 * off. Carries the order number and a link to admin, never customer details —
 * a mailbox is not the place for someone's home address.
 */
export async function sendPrintAlertEmail(alert: {
  kind: "offline" | "failed"
  orderCodes: string[]
  detail?: string
}): Promise<void> {
  const recipients = splitEmailList((await getSiteSettings()).printAlertEmail)
  if (recipients.length === 0) return

  const template = alert.kind === "offline" ? "print_alert_offline" : "print_alert_failed"

  if (alert.kind === "offline") {
    const since = new Date(Date.now() - PRINT_OFFLINE_ALERT_GAP_MS).toISOString()
    const { count } = await supabaseAdmin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("template", template)
      .eq("status", "sent")
      .gte("sent_at", since)
    if ((count ?? 0) > 0) return
  }

  const orders = alert.orderCodes.join(", ")
  const subject =
    alert.kind === "offline"
      ? `Receipt printing is offline — order ${orders} is waiting`
      : `Receipt failed to print — order ${orders}`

  const body =
    alert.kind === "offline"
      ? `<p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
           Order ${escapeHtml(orders)} was paid, but its receipt can't print right now:
           the print agent at the shop hasn't checked in recently. Usually the shop
           computer is off or asleep, the agent window was closed, or the printer
           is off.
         </p>
         <p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
           Nothing is lost — the receipt stays queued and prints as soon as the
           agent and printer are back. You won't get another of these for an hour.
         </p>`
      : `<p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
           The receipt for order ${escapeHtml(orders)} failed after repeated tries
           and has stopped retrying.
         </p>
         ${
           alert.detail
             ? `<p style="font-size:13px;color:#8f8b7f;line-height:1.6;margin:0 0 16px;">Last error: ${escapeHtml(alert.detail)}</p>`
             : ""
         }
         <p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
           Check the printer for paper and errors, then reprint it from the
           printing page.
         </p>`

  for (const to of recipients) await send(
    to,
    subject,
    renderLayout(
      alert.kind === "offline" ? "Receipt printing is offline" : "A receipt failed to print",
      `${body}
      <p style="margin:24px 0 0;">
        <a href="${appUrl()}/admin/printing"
           style="display:inline-block;background-color:#1d6ad4;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
          Open printing
        </a>
      </p>`
    ),
    { category: "transactional", template, mailbox: "orders" }
  )
}

/**
 * Tells the owner a crypto order was underpaid and is waiting on a person: the
 * customer sent less than the invoice and it expired, so the order was neither
 * marked paid nor dropped. Same recipient setting as the print alerts.
 */
export async function sendPaymentReviewEmail(alert: {
  orderCode: string
  receivedCents: number
  expectedCents: number
  /** Paid in full a second time, on another invoice for an order already paid. */
  secondPayment?: boolean
}): Promise<void> {
  const recipients = splitEmailList((await getSiteSettings()).printAlertEmail)
  if (recipients.length === 0) return

  const subject = alert.secondPayment
    ? `Order ${alert.orderCode} was paid twice — needs review`
    : `Order ${alert.orderCode} was underpaid — needs review`
  const body = `<p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
      ${
        alert.secondPayment
          ? `Order ${alert.orderCode} was already paid, and the customer has paid
             ${formatAmount(alert.receivedCents)} again on a second invoice. The
             order was not changed.`
          : `The customer for order ${alert.orderCode} paid ${formatAmount(alert.receivedCents)}
             of ${formatAmount(alert.expectedCents)}, and the payment window has closed.
             The order has not been marked paid and nothing has shipped.`
      }
    </p>
    <p style="font-size:14px;color:#514e48;line-height:1.6;margin:0 0 16px;">
      ${
        alert.secondPayment
          ? "Refund the extra payment from your BTCPay store, or offer it as store credit."
          : "Contact the customer to arrange the difference, or refund what they sent from your BTCPay store."
      }
    </p>
    <p style="margin:24px 0 0;">
      <a href="${appUrl()}/admin/payments"
         style="display:inline-block;background-color:#1d6ad4;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
        Open payments
      </a>
    </p>`

  for (const to of recipients) await send(to, subject, renderLayout("An order was underpaid", body), {
    category: "transactional",
    template: "payment_review",
    entityId: alert.orderCode,
    mailbox: "orders",
  })
}
