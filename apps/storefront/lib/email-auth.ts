import "server-only"

// Auth email bodies. Kept apart from lib/email.ts because these are sent by the
// Supabase hook rather than by the app, and must never touch the marketing
// consent path — a password reset is transactional by definition and always
// sends, regardless of opt-in.

export type AuthEmailAction =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "email_change_current"
  | "email_change_new"

type Copy = { subject: string; heading: string; body: string; cta: string }

const COPY: Record<string, Copy> = {
  signup: {
    subject: "Confirm your email — Midwestern Peptides",
    heading: "Confirm your email",
    body: "Tap below to finish setting up your account. The link expires in 24 hours.",
    cta: "Confirm email",
  },
  recovery: {
    subject: "Reset your password — Midwestern Peptides",
    heading: "Reset your password",
    body: "Tap below to choose a new password. If you didn't ask for this, you can ignore this email — your password won't change.",
    cta: "Reset password",
  },
  magiclink: {
    subject: "Your sign-in link — Midwestern Peptides",
    heading: "Sign in",
    body: "Tap below to sign in. The link works once and expires shortly.",
    cta: "Sign in",
  },
  invite: {
    subject: "You've been invited — Midwestern Peptides",
    heading: "You've been invited",
    body: "Tap below to set up your account.",
    cta: "Accept invite",
  },
  email_change: {
    subject: "Confirm your new email — Midwestern Peptides",
    heading: "Confirm your new email address",
    body: "Tap below to confirm this address on your account.",
    cta: "Confirm address",
  },
}

const FALLBACK: Copy = {
  subject: "Action required — Midwestern Peptides",
  heading: "Confirm this request",
  body: "Tap below to continue.",
  cta: "Continue",
}

/**
 * Table-based layout, matching the transactional templates in lib/email.ts.
 * No unsubscribe footer: these are account-security emails, and offering to
 * opt out of a password reset would be wrong.
 */
export function renderAuthEmail(
  action: AuthEmailAction,
  confirmUrl: string
): { subject: string; html: string } {
  const copy = COPY[action] ?? FALLBACK

  const html = `<!DOCTYPE html>
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
            <h1 style="margin:0 0 16px;font-size:20px;color:#1c1b18;">${copy.heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#514e48;line-height:1.6;">${copy.body}</p>
            <a href="${confirmUrl}" style="background-color:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">${copy.cta}</a>
            <p style="margin:24px 0 0;font-size:12px;color:#8f8b7f;line-height:1.6;">
              If the button doesn't work, paste this into your browser:<br/>
              <span style="color:#6b6760;word-break:break-all;">${confirmUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #ebe9e3;">
            <p style="margin:0;font-size:11px;color:#8f8b7f;line-height:1.5;">
              All products are sold for laboratory research use only. Not for human or veterinary use.<br/>
              Midwestern Peptides
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject: copy.subject, html }
}
