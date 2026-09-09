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
      {description && <p className="mt-0.5 text-xs text-sand-600">{description}</p>}
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
        <p className="mt-0.5 text-sm text-sand-600">
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
              <p className="text-center text-xs text-sand-600">Badges hidden</p>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Payments"
        description="Which payment methods checkout offers. Both default to off — nothing takes money until you deliberately enable it."
      >
        <SettingToggle
          field="cardPaymentsEnabled"
          label="Card payments (Stripe)"
          description="The integration is built and tested, but Stripe's Restricted Businesses policy prohibits peptides."
          warning="Stripe closes accounts that process peptide sales and holds funds for 90–180 days. Leave this off until you have a processor that permits this category."
          initial={settings.cardPaymentsEnabled}
        />
        <SettingToggle
          field="cryptoPaymentsEnabled"
          label="Crypto payments (NOWPayments)"
          description="No underwriting and no chargebacks. Requires NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET."
          warning="Crypto payments cannot be reversed — refunds must be issued manually."
          initial={settings.cryptoPaymentsEnabled}
        />
        <SettingField
          field="cryptoTolerancePercent"
          label="Underpayment tolerance"
          description="Network fees mean crypto rarely lands on the exact amount. A shortfall within this much is accepted; anything larger is held for your review instead of shipping."
          initial={settings.cryptoTolerancePercent}
          type="number"
          min={0}
          max={10}
          suffix="%"
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
        title="Order label printing"
        description="Prints a 4×6 packing label on the Zebra as soon as an order is paid. Setup steps are in tools/print-agent/README.md."
      >
        <SettingToggle
          field="autoPrintOrderLabels"
          label="Print a label for every paid order"
          description="Labels queue the moment payment clears, whether or not anyone is at the computer. A label that can't print now stays queued and prints when the printer is back."
          warning="Leave this off until a test label has printed. Nothing prints while it is off, and you can still print any order by hand from the Orders page."
          initial={settings.autoPrintOrderLabels}
        />
        <SettingField
          field="printLabelCopies"
          label="Copies per order"
          description="Two is useful if one goes on the box and one goes inside it."
          initial={settings.printLabelCopies}
          type="number"
          min={1}
          max={5}
          suffix="labels"
        />
        <SettingField
          field="labelPrinterSerial"
          label="Printer serial number"
          description="On the sticker underneath the Zebra, and on the configuration label it prints at startup. This is how Zebra's cloud knows which printer is yours — leave it empty if you are using the local print agent instead."
          initial={settings.labelPrinterSerial}
          placeholder="XXZJJ174600974"
          maxLength={40}
        />
        <SettingField
          field="labelPrinterHost"
          label="Printer address on the shop network"
          description="Only used by the local print agent. Change it here if the printer's address moves — no need to touch the computer it runs on."
          initial={settings.labelPrinterHost}
          placeholder="192.168.1.74"
          maxLength={60}
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

      <Section
        title="Welcome email"
        description="Sent once when someone creates an account. Never contains a password — we only store a hash, and mailing a credential would leave it sitting in an inbox. Available placeholder: {{customer_name}}."
      >
        <SettingField
          field="emailWelcomeSubject"
          label="Subject line"
          initial={settings.emailWelcomeSubject}
          maxLength={300}
        />
        <SettingField
          field="emailWelcomeHeading"
          label="Heading"
          description="The large line at the top of the email body."
          initial={settings.emailWelcomeHeading}
          maxLength={300}
        />
        <SettingField
          field="emailWelcomeBody"
          label="Body text"
          description="Blank lines separate paragraphs. Plain text only — the branded layout, order table and buttons are added automatically."
          initial={settings.emailWelcomeBody}
          rows={6}
          maxLength={2000}
        />
      </Section>

      <Section
        title="Order confirmation"
        description="Sent from orders@ the moment payment is confirmed, with the itemised PDF receipt attached. Available placeholder: {{order_number}}."
      >
        <SettingField
          field="emailOrderConfirmationSubject"
          label="Subject line"
          initial={settings.emailOrderConfirmationSubject}
          maxLength={300}
        />
        <SettingField
          field="emailOrderConfirmationHeading"
          label="Heading"
          description="The large line at the top of the email body."
          initial={settings.emailOrderConfirmationHeading}
          maxLength={300}
        />
        <SettingField
          field="emailOrderConfirmationBody"
          label="Body text"
          description="Blank lines separate paragraphs. Plain text only — the branded layout, order table and buttons are added automatically."
          initial={settings.emailOrderConfirmationBody}
          rows={6}
          maxLength={2000}
        />
      </Section>

      <Section
        title="Order shipped"
        description="Sent from orders@ when you mark an order shipped. Tracking details are added automatically when present. Available placeholder: {{order_number}}."
      >
        <SettingField
          field="emailOrderShippedSubject"
          label="Subject line"
          initial={settings.emailOrderShippedSubject}
          maxLength={300}
        />
        <SettingField
          field="emailOrderShippedHeading"
          label="Heading"
          description="The large line at the top of the email body."
          initial={settings.emailOrderShippedHeading}
          maxLength={300}
        />
        <SettingField
          field="emailOrderShippedBody"
          label="Body text"
          description="Blank lines separate paragraphs. Plain text only — the branded layout, order table and buttons are added automatically."
          initial={settings.emailOrderShippedBody}
          rows={6}
          maxLength={2000}
        />
      </Section>

      <Section
        title="Abandoned cart"
        description="Marketing mail — only reaches customers who opted in, and always carries an unsubscribe link."
      >
        <SettingField
          field="emailAbandonedCartSubject"
          label="Subject line"
          initial={settings.emailAbandonedCartSubject}
          maxLength={300}
        />
        <SettingField
          field="emailAbandonedCartHeading"
          label="Heading"
          description="The large line at the top of the email body."
          initial={settings.emailAbandonedCartHeading}
          maxLength={300}
        />
        <SettingField
          field="emailAbandonedCartBody"
          label="Body text"
          description="Blank lines separate paragraphs. Plain text only — the branded layout, order table and buttons are added automatically."
          initial={settings.emailAbandonedCartBody}
          rows={6}
          maxLength={2000}
        />
      </Section>

      <Section
        title="Privacy and analytics"
        description="Google Analytics only loads for visitors who accept. Turning the banner off means nobody can accept, so nothing is tracked at all."
      >
        <SettingToggle
          field="showCookieBanner"
          label="Show cookie consent banner"
          description="A bar at the bottom of the storefront asking to accept analytics cookies. Required for analytics to run — with this off, no analytics cookie is ever set."
          initial={settings.showCookieBanner}
        />
      </Section>

      <Section
        title="Research use disclaimer"
        description="Shown in full on /disclaimer and summarised in the footer of every page."
      >
        <SettingToggle
          field="showDisclaimerStrip"
          label="Show disclaimer in the footer"
          description="A short research-use notice above the copyright line, linking to the full page."
          initial={settings.showDisclaimerStrip}
        />
        <SettingField
          field="disclaimerBody"
          label="Disclaimer text"
          description="Blank lines separate paragraphs. The first paragraph is emphasised on the page."
          initial={settings.disclaimerBody}
          rows={12}
          maxLength={8000}
        />
      </Section>
    </div>
  )
}
