import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Midwestern Peptides Privacy Policy — how we collect, use, and protect your personal information.",
}

const LAST_UPDATED = "May 24, 2026"

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 prose prose-gray max-w-none">
        <p>
          Midwestern Peptides LLC ("we," "us," or "our") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you visit our website or make a purchase.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> Name, email address, password (hashed)</li>
          <li><strong>Order information:</strong> Shipping address, billing address, order history</li>
          <li><strong>Payment information:</strong> We do not store payment card data. Payments are processed by Stripe directly.</li>
          <li><strong>Communications:</strong> Messages you send to our support team</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li>IP address, browser type, operating system</li>
          <li>Pages visited, time on site, referring URLs</li>
          <li>Cart and session data (via secure cookies)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping notifications</li>
          <li>Respond to customer support inquiries</li>
          <li>Prevent fraud and ensure platform security</li>
          <li>Comply with legal obligations</li>
          <li>Improve our website and services (aggregated, anonymized analytics only)</li>
        </ul>

        <p>
          We do <strong>not</strong> sell your personal information to third parties.
          We do <strong>not</strong> use your data for advertising profiling.
        </p>

        <h2>3. Data Sharing</h2>
        <p>We share your information only with:</p>
        <ul>
          <li><strong>Shipping carriers</strong> (name and address, to fulfill your order)</li>
          <li><strong>Stripe</strong> (payment processing only)</li>
          <li><strong>Resend</strong> (transactional email delivery)</li>
          <li><strong>Law enforcement</strong> (only if required by valid legal process)</li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          We use essential cookies for cart session management and authentication.
          We use analytics cookies to understand aggregate site usage.
          You may disable non-essential cookies in your browser settings.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We retain order records for 7 years for tax and legal compliance.
          Account information is retained while your account is active.
          You may request deletion of your account and associated data at any time.
        </p>

        <h2>6. Your Rights</h2>
        <p>Depending on your location, you may have rights to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate personal data</li>
          <li>Request deletion of your personal data</li>
          <li>Opt out of marketing communications at any time</li>
          <li>Data portability (GDPR / CCPA)</li>
        </ul>
        <p>
          To exercise any of these rights, email:{" "}
          <a href="mailto:privacy@midwesternpeptides.com" className="text-brand-600">
            privacy@midwesternpeptides.com
          </a>
        </p>

        <h2>7. Security</h2>
        <p>
          We implement industry-standard security measures including HTTPS/TLS encryption,
          hashed passwords, and access controls. No method of transmission over the internet
          is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Our website is not directed to individuals under 21 years of age. We do not
          knowingly collect personal information from anyone under 21.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of material
          changes by updating the "Last updated" date above. Continued use of our site
          constitutes acceptance of the updated policy.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          Midwestern Peptides LLC<br />
          North Dakota, USA<br />
          Email:{" "}
          <a href="mailto:privacy@midwesternpeptides.com" className="text-brand-600">
            privacy@midwesternpeptides.com
          </a>
        </p>
      </div>
    </main>
  )
}
