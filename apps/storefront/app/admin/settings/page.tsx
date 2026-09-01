import { requireAdminOrRedirect } from "@/lib/admin"
import { getSiteSettings } from "@/lib/settings"
import { transportStatus } from "@/lib/email-transport"
import { SettingToggle } from "@/components/admin/setting-toggle"
import { AnnouncementField } from "@/components/admin/announcement-field"
import { SettingField } from "@/components/admin/setting-field"
import { EmailStatus } from "@/components/admin/email-status"
import { SettingSelect } from "@/components/admin/setting-select"
import { PaymentBadges } from "@/components/store/payment-badges"

export const dynamic = "force-dynamic"

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-sand-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-sand-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-sand-500">{description}</p>}
      <div className="mt-2 divide-y divide-sand-100">{children}</div>
    </section>
  )
}

export default async function AdminSettingsPage() {
  await requireAdminOrRedirect()

  const settings = await getSiteSettings()
  const transport = transportStatus()
  const bulkTransport = transportStatus("resend")
  const bulkReady = bulkTransport.kind === "resend"

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Settings</h1>
        <p className="mt-0.5 text-sm text-sand-500">
          Show or hide parts of the storefront. Changes take effect immediately.
        </p>
      </header>

      <Section
        title="Payment badges"
        description="Card logos shown on the cart and checkout pages."
      >
        <SettingToggle
          field="showPaymentBadges"
          label="Show payment badges"
          description="Visa, Mastercard, Amex, and Discover — all accepted today."
          initial={settings.showPaymentBadges}
        />
        <SettingToggle
          field="showApplePayBadge"
          label="Show Apple Pay badge"
          description="Apple Pay is enabled on the Stripe account but needs domain verification with Apple before it appears at checkout."
          warning="Until Apple domain verification passes, this badge advertises a method customers won't be offered."
          initial={settings.showApplePayBadge}
        />
        <SettingToggle
          field="showAmazonPayBadge"
          label="Show Amazon Pay badge"
          description="Enabled on the Stripe account, but needs the account to finish onboarding."
          warning="Customers won't see Amazon Pay at checkout until the Stripe account is activated."
          initial={settings.showAmazonPayBadge}
        />

        <div className="pt-3.5">
          <p className="mb-2 text-xs font-medium text-sand-600">Preview</p>
          <div className="rounded-lg bg-sand-50 p-3">
            {settings.showPaymentBadges ? (
              <PaymentBadges
                showApplePay={settings.showApplePayBadge}
                showAmazonPay={settings.showAmazonPayBadge}
              />
            ) : (
              <p className="text-center text-xs text-sand-400">Badges hidden</p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Checkout">
        <SettingToggle
          field="showCryptoPayment"
          label="Offer crypto payment"
          description="Shows the crypto option at checkout. The NOWPayments integration is not built yet — selecting it currently errors."
          warning="Crypto checkout is not implemented. Customers choosing it will hit an error."
          initial={settings.showCryptoPayment}
        />
      </Section>

      <Section title="Catalog">
        <SettingToggle
          field="hideOutOfStock"
          label="Hide out-of-stock products"
          description="Removes products with no stock from listings instead of showing them as unavailable."
          initial={settings.hideOutOfStock}
        />
      </Section>

      <Section
        title="Email"
        description="Marketing email only ever goes to addresses with recorded opt-in — these switches control whether it sends at all."
      >
        <EmailStatus detail={transport.detail} ready={transport.ready} />
        <SettingToggle
          field="abandonedCartEmails"
          label="Abandoned cart reminders"
          description="One reminder per cart, 1–48 hours after it was last touched. Counts as marketing, so it only reaches opted-in customers."
          warning="Requires a configured email transport and a Vercel Cron job hitting /api/cron/abandoned-carts."
          initial={settings.abandonedCartEmails}
        />
        <SettingField
          field="abandonedCartDelayHours"
          label="Wait before reminding"
          description="How long after a cart is last touched before the reminder sends. Too soon feels pushy; too late and they've moved on."
          initial={settings.abandonedCartDelayHours}
          type="number"
          min={1}
          max={72}
          suffix="hours"
        />
        <SettingField
          field="abandonedCartWindowHours"
          label="Stop reminding after"
          description="Carts older than this are left alone — the intent is stale and the email reads as spam."
          initial={settings.abandonedCartWindowHours}
          type="number"
          min={2}
          max={336}
          suffix="hours"
        />
        <SettingToggle
          field="marketingEmails"
          label="Promotional campaigns"
          description="Allows campaigns to be sent from the Campaigns page."
          warning="Campaigns can't send until a business postal address is set below."
          initial={settings.marketingEmails}
        />
        <SettingSelect
          field="marketingTransport"
          label="Send bulk email via"
          description="Mailbox hosts like Porkbun cap daily sends and generally forbid marketing mail. A dedicated provider protects your order email from being rate-limited alongside a campaign."
          initial={settings.marketingTransport}
          options={[
            {
              value: "same",
              label: "Same as order email",
              note: `Currently ${transport.detail}. Fine for small lists; watch your host's daily limit.`,
            },
            {
              value: "resend",
              label: bulkReady ? "Resend (configured)" : "Resend — not configured",
              disabled: !bulkReady,
              note: bulkReady
                ? "Campaigns go via Resend; order email stays on your own mailbox."
                : "Add RESEND_API_KEY to .env.local to enable this option.",
            },
          ]}
        />
        <SettingField
          field="marketingDailyCap"
          label="Daily marketing send cap"
          description="Hard ceiling on marketing emails per day. A mistake in a campaign stops here instead of reaching your whole list."
          initial={settings.marketingDailyCap}
          type="number"
          min={1}
          max={50000}
          suffix="per day"
        />
        <SettingField
          field="businessPostalAddress"
          label="Business postal address"
          description="Printed in the footer of every promotional email. CAN-SPAM requires a real physical address — campaigns will refuse to send while this is empty."
          initial={settings.businessPostalAddress}
          placeholder="Midwestern Peptides, 123 Example St, Fargo, ND 58102"
        />
      </Section>

      <Section title="Announcement banner">
        <SettingToggle
          field="showAnnouncement"
          label="Show announcement banner"
          description="A single line across the top of every storefront page."
          initial={settings.showAnnouncement}
        />
        <AnnouncementField initial={settings.announcementText} />
      </Section>
    </div>
  )
}
