import "server-only"
import nodemailer from "nodemailer"
import { Resend } from "resend"

// How mail actually leaves the building. Which transport is used is
// per-environment wiring, not an owner preference, so it lives in env vars
// rather than site_settings (AGENTS.md §2).
//
//   smtp   — your own mailbox (Google Workspace, domain host, anything SMTP).
//            Right for transactional order mail; mailbox providers generally
//            forbid bulk marketing and cap daily recipients.
//   resend — an email API with domain authentication. Right for campaigns.
//   none   — nothing configured; sends are logged and skipped.

export type TransportKind = "smtp" | "resend" | "none"

/**
 * Which mailbox a message goes out from. Porkbun authenticates per mailbox, so
 * sending as orders@ requires orders@ credentials — the From header alone is
 * not enough. Order mail and support mail also land in different inboxes, so
 * replies reach whoever can actually answer them.
 */
export type Mailbox = "orders" | "support"

/** Credentials for one mailbox, falling back to the shared pair. */
function mailboxCredentials(mailbox: Mailbox): {
  user?: string
  pass?: string
  from?: string
} {
  if (mailbox === "orders" && process.env.SMTP_ORDERS_USER) {
    return {
      user: process.env.SMTP_ORDERS_USER,
      pass: process.env.SMTP_ORDERS_PASSWORD,
      from: process.env.EMAIL_FROM_ORDERS,
    }
  }
  return {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM,
  }
}

/** The From header for a mailbox, so callers do not each rebuild it. */
export function mailboxFrom(mailbox: Mailbox): string {
  const { from, user } = mailboxCredentials(mailbox)
  return from ?? user ?? "Midwestern Peptides <no-reply@midwesternpeptides.com>"
}

export type SendResult = { ok: true } | { ok: false; error: string }

/**
 * Which transport to use. `prefer` lets bulk mail run over a different provider
 * than transactional — a mailbox host is fine for receipts but caps daily sends
 * and generally forbids marketing. Falls back when the preferred one has no
 * credentials, so a misconfigured preference degrades instead of failing.
 */
export function activeTransport(prefer?: "resend" | "smtp"): TransportKind {
  if (prefer === "resend" && process.env.RESEND_API_KEY) return "resend"
  if (prefer === "smtp" && process.env.SMTP_HOST && process.env.SMTP_USER) return "smtp"

  const explicit = process.env.EMAIL_TRANSPORT?.trim().toLowerCase()
  if (explicit === "smtp" || explicit === "resend") return explicit

  // Infer when unset, so adding credentials is enough to start sending.
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return "smtp"
  if (process.env.RESEND_API_KEY) return "resend"
  return "none"
}

/** Human-readable config state for the admin email panel. Never returns secrets. */
export function transportStatus(prefer?: "resend" | "smtp"): {
  kind: TransportKind
  detail: string
  ready: boolean
} {
  const kind = activeTransport(prefer)
  if (kind === "smtp") {
    const host = process.env.SMTP_HOST ?? ""
    const port = process.env.SMTP_PORT ?? "587"
    return {
      kind,
      detail: `SMTP · ${host}:${port}`,
      ready: Boolean(host && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    }
  }
  if (kind === "resend") {
    return { kind, detail: "Resend API", ready: true }
  }
  return {
    kind,
    detail: "Not configured — nothing will send",
    ready: false,
  }
}

// One pooled connection per mailbox — reconnecting for every message is slow,
// and mailbox hosts rate-limit new sessions.
const cachedSmtp = new Map<Mailbox, nodemailer.Transporter>()

function smtpTransport(mailbox: Mailbox): nodemailer.Transporter {
  const cached = cachedSmtp.get(mailbox)
  if (cached) return cached

  const port = Number(process.env.SMTP_PORT ?? 587)
  const { user, pass } = mailboxCredentials(mailbox)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS. Never plaintext.
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
  })
  cachedSmtp.set(mailbox, transport)
  return transport
}

/**
 * Delivers one message. Returns a result rather than throwing — callers decide
 * what a failure means, and a failed send must never break checkout.
 *
 * Errors are returned for the send log; they are never surfaced to a customer,
 * because SMTP errors leak host names and usernames.
 */
export async function deliver(input: {
  from: string
  to: string
  subject: string
  html: string
  headers?: Record<string, string>
  prefer?: "resend" | "smtp"
  /** Which mailbox authenticates and sends. Defaults to support. */
  mailbox?: Mailbox
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}): Promise<SendResult> {
  const mailbox: Mailbox = input.mailbox ?? "support"
  const kind = activeTransport(input.prefer)

  if (kind === "none") {
    return { ok: false, error: "no email transport configured" }
  }

  try {
    if (kind === "smtp") {
      await smtpTransport(mailbox).sendMail({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        headers: input.headers,
        attachments: input.attachments,
      })
      return { ok: true }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.headers ? { headers: input.headers } : {}),
      ...(input.attachments
        ? {
            attachments: input.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }
        : {}),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Proves the credentials work without sending anything. SMTP only. */
export async function verifyTransport(): Promise<SendResult> {
  const kind = activeTransport()
  if (kind === "none") return { ok: false, error: "no email transport configured" }
  if (kind === "resend") return { ok: true }

  try {
    await smtpTransport("support").verify()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
