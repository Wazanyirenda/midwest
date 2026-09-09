import "server-only"
import { cache } from "react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type SiteSettings = {
  showPaymentBadges: boolean
  showApplePayBadge: boolean
  showAmazonPayBadge: boolean
  hideOutOfStock: boolean
  showAnnouncement: boolean
  announcementText: string
  showDisclaimerStrip: boolean
  disclaimerBody: string
  showCookieBanner: boolean
  /** Owner-editable email copy. The HTML shell stays in code. */
  emailWelcomeSubject: string
  emailWelcomeHeading: string
  emailWelcomeBody: string
  emailOrderConfirmationSubject: string
  emailOrderConfirmationHeading: string
  emailOrderConfirmationBody: string
  emailOrderShippedSubject: string
  emailOrderShippedHeading: string
  emailOrderShippedBody: string
  emailAbandonedCartSubject: string
  emailAbandonedCartHeading: string
  emailAbandonedCartBody: string
  abandonedCartEmails: boolean
  marketingEmails: boolean
  abandonedCartDelayHours: number
  abandonedCartWindowHours: number
  businessPostalAddress: string
  /** Which configured transport bulk mail uses. Never holds a credential. */
  marketingTransport: "same" | "resend"
  marketingDailyCap: number
  cardPaymentsEnabled: boolean
  cryptoPaymentsEnabled: boolean
  cryptoTolerancePercent: number
  autoPrintOrderLabels: boolean
  printLabelCopies: number
  /** Zebra serial number, for cloud printing via Zebra Data Services. */
  labelPrinterSerial: string
  /** Printer's LAN address, read by the local print agent. */
  labelPrinterHost: string
}

const DEFAULT_DISCLAIMER = `All products sold by Midwestern Peptides are intended strictly for laboratory research use. They are not designed or approved for human or animal consumption, and must not be used for any diagnostic, therapeutic, or medical application.

Midwestern Peptides does not provide instructions relating to preparation, reconstitution, administration, dosage, or any form of usage.

No product sold on this site is a drug, dietary supplement, or medical device, and none has been evaluated by the Food and Drug Administration for safety or efficacy.

All items are labeled "For Research Use Only — Not for Human or Veterinary Use."

By purchasing, you confirm that you are at least 21 years of age, that you are acquiring these materials for lawful research purposes, and that you are qualified to handle them safely. Any misuse, diversion, or resale for human consumption is prohibited and may violate federal, state, or international law.`

/**
 * Mirrors the seeded rows in 20260901000016_site_settings.sql. These apply when
 * a row is missing or the table can't be read, so a settings outage renders a
 * normal storefront rather than an error — and every default is the
 * conservative choice (nothing promised that isn't verified working).
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  showPaymentBadges: true,
  showApplePayBadge: false,
  showAmazonPayBadge: false,
  hideOutOfStock: false,
  showAnnouncement: false,
  announcementText: "",
  showDisclaimerStrip: true,
  // Mirrors the seeded row in 20260901000021. A settings outage must still
  // render a complete research-use notice, never an empty one.
  disclaimerBody: DEFAULT_DISCLAIMER,
  // On by default: without the banner nobody can consent, so analytics never
  // loads. A settings outage must not silently start tracking either.
  showCookieBanner: true,
  // Mirror the seeded rows in 20260908000029_email_templates.sql.
  emailWelcomeSubject: "Welcome to Midwestern Peptides",
  emailWelcomeHeading: "Your account is ready",
  emailWelcomeBody: "Thanks for creating an account. You can now track orders, save addresses, and request a certificate of analysis for any lot you buy.\n\nWe never send your password by email. If you ever need to change it, use the reset link on the sign-in page.",
  emailOrderConfirmationSubject: "Order {{order_number}} confirmed",
  emailOrderConfirmationHeading: "Order {{order_number}} confirmed",
  emailOrderConfirmationBody: "Thanks for your order. We have received it and will start preparing it right away, and you will get another email with tracking once it ships.\n\nYour receipt is attached to this email as a PDF.",
  emailOrderShippedSubject: "Your order {{order_number}} is on its way",
  emailOrderShippedHeading: "Your order has shipped",
  emailOrderShippedBody: "Good news - your order is on its way. Tracking details are below where available.",
  emailAbandonedCartSubject: "You left something in your cart",
  emailAbandonedCartHeading: "Still thinking it over?",
  emailAbandonedCartBody: "Your cart is still saved. Stock moves quickly on popular compounds, so we wanted to let you know before it sells out.",
  // Both default off: no marketing goes out until you deliberately enable it.
  abandonedCartEmails: false,
  marketingEmails: false,
  abandonedCartDelayHours: 1,
  abandonedCartWindowHours: 48,
  // Empty blocks campaign sends: CAN-SPAM requires a real postal address, and
  // inventing one would be worse than refusing to send.
  businessPostalAddress: "",
  marketingTransport: "same",
  marketingDailyCap: 200,
  // Card is off by default: Stripe's Restricted Businesses policy prohibits
  // peptides, and processing them gets the account closed with a 90-180 day
  // fund hold. Do not enable until a processor that permits this category is in
  // place. Crypto is off until NOWPayments credentials exist.
  cardPaymentsEnabled: false,
  cryptoPaymentsEnabled: false,
  cryptoTolerancePercent: 2,
  // Off until the printer is confirmed working: a settings outage must not
  // start firing labels at a printer nobody is watching.
  autoPrintOrderLabels: false,
  printLabelCopies: 1,
  labelPrinterSerial: "",
  labelPrinterHost: "",
}

/** DB key ↔ camelCase field. The DB key is the stable name. */
export const SETTING_KEYS: Record<keyof SiteSettings, string> = {
  showPaymentBadges: "show_payment_badges",
  showApplePayBadge: "show_apple_pay_badge",
  showAmazonPayBadge: "show_amazon_pay_badge",
  hideOutOfStock: "hide_out_of_stock",
  showAnnouncement: "show_announcement",
  announcementText: "announcement_text",
  showDisclaimerStrip: "show_disclaimer_strip",
  disclaimerBody: "disclaimer_body",
  showCookieBanner: "show_cookie_banner",
  emailWelcomeSubject: "email_welcome_subject",
  emailWelcomeHeading: "email_welcome_heading",
  emailWelcomeBody: "email_welcome_body",
  emailOrderConfirmationSubject: "email_order_confirmation_subject",
  emailOrderConfirmationHeading: "email_order_confirmation_heading",
  emailOrderConfirmationBody: "email_order_confirmation_body",
  emailOrderShippedSubject: "email_order_shipped_subject",
  emailOrderShippedHeading: "email_order_shipped_heading",
  emailOrderShippedBody: "email_order_shipped_body",
  emailAbandonedCartSubject: "email_abandoned_cart_subject",
  emailAbandonedCartHeading: "email_abandoned_cart_heading",
  emailAbandonedCartBody: "email_abandoned_cart_body",
  abandonedCartEmails: "abandoned_cart_emails",
  marketingEmails: "marketing_emails",
  abandonedCartDelayHours: "abandoned_cart_delay_hours",
  abandonedCartWindowHours: "abandoned_cart_window_hours",
  businessPostalAddress: "business_postal_address",
  marketingTransport: "marketing_transport",
  marketingDailyCap: "marketing_daily_cap",
  cardPaymentsEnabled: "card_payments_enabled",
  cryptoPaymentsEnabled: "crypto_payments_enabled",
  cryptoTolerancePercent: "crypto_tolerance_percent",
  autoPrintOrderLabels: "auto_print_order_labels",
  printLabelCopies: "print_label_copies",
  labelPrinterSerial: "label_printer_serial",
  labelPrinterHost: "label_printer_host",
}

/**
 * Deduped per request via React cache(), so several components can ask for
 * settings without each one hitting the database.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const { data, error } = await supabaseAdmin.from("site_settings").select("key,value")

  if (error || !data) {
    if (error) console.error("[settings] falling back to defaults:", error.message)
    return DEFAULT_SETTINGS
  }

  const byKey = new Map(data.map((row) => [row.key, row.value]))
  const resolved = { ...DEFAULT_SETTINGS }

  for (const [field, key] of Object.entries(SETTING_KEYS) as Array<
    [keyof SiteSettings, string]
  >) {
    if (!byKey.has(key)) continue
    const raw = byKey.get(key)
    // Only take a stored value when its type matches the default's, so a
    // malformed row can't turn a boolean flag into a string.
    if (typeof raw === typeof DEFAULT_SETTINGS[field]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(resolved as any)[field] = raw
    }
  }

  return resolved
})
