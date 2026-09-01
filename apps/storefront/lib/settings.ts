import "server-only"
import { cache } from "react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type SiteSettings = {
  showPaymentBadges: boolean
  showApplePayBadge: boolean
  showAmazonPayBadge: boolean
  showCryptoPayment: boolean
  hideOutOfStock: boolean
  showAnnouncement: boolean
  announcementText: string
  abandonedCartEmails: boolean
  marketingEmails: boolean
  abandonedCartDelayHours: number
  abandonedCartWindowHours: number
  businessPostalAddress: string
  /** Which configured transport bulk mail uses. Never holds a credential. */
  marketingTransport: "same" | "resend"
  marketingDailyCap: number
}

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
  showCryptoPayment: false,
  hideOutOfStock: false,
  showAnnouncement: false,
  announcementText: "",
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
}

/** DB key ↔ camelCase field. The DB key is the stable name. */
export const SETTING_KEYS: Record<keyof SiteSettings, string> = {
  showPaymentBadges: "show_payment_badges",
  showApplePayBadge: "show_apple_pay_badge",
  showAmazonPayBadge: "show_amazon_pay_badge",
  showCryptoPayment: "show_crypto_payment",
  hideOutOfStock: "hide_out_of_stock",
  showAnnouncement: "show_announcement",
  announcementText: "announcement_text",
  abandonedCartEmails: "abandoned_cart_emails",
  marketingEmails: "marketing_emails",
  abandonedCartDelayHours: "abandoned_cart_delay_hours",
  abandonedCartWindowHours: "abandoned_cart_window_hours",
  businessPostalAddress: "business_postal_address",
  marketingTransport: "marketing_transport",
  marketingDailyCap: "marketing_daily_cap",
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
