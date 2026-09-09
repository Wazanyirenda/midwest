import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Midwestern Peptides Privacy Policy — how we collect, use, and protect your personal information.",
}

const LAST_UPDATED = "September 8, 2026"

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-600">Last updated: {LAST_UPDATED}</p>

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
          <li><strong>Payment information:</strong> We never see or store card numbers. Card payments, where enabled, are processed by Stripe; cryptocurrency payments are processed by NOWPayments. We retain only the payment reference and the amount.</li>
          <li><strong>Communications:</strong> Messages you send to our support team</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li>IP address, browser type, operating system</li>
          <li>Pages visited, time on site, referring URLs &mdash; only if you accept analytics cookies</li>
          <li>Cart and session data (via secure cookies)</li>
          <li>
            <strong>Abuse-prevention records:</strong> we store your IP address for a short
            period against sign-in, sign-up, password-reset, newsletter and payment attempts,
            so that automated attacks can be rate-limited
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping notifications</li>
          <li>Respond to customer support inquiries</li>
          <li>Prevent fraud and ensure platform security</li>
          <li>Comply with legal obligations</li>
          <li>Remind you about items left in your cart, unless you have opted out</li>
          <li>Send you product news, only if you explicitly opted in</li>
          <li>Understand how the site is used, only if you accept analytics cookies</li>
        </ul>

        <p>
          We do <strong>not</strong> sell your personal information to third parties.
          We do <strong>not</strong> use your data for advertising profiling, and we run no
          advertising or retargeting pixels.
        </p>

        <h2>3. Service Providers</h2>
        <p>
          We do not sell or rent your data. We do rely on the following providers to run the
          store, and each processes only what its function requires:
        </p>
        <ul>
          <li><strong>Supabase</strong> &mdash; hosts our database and accounts. Your account, addresses and order history are stored here.</li>
          <li><strong>Vercel</strong> &mdash; hosts and serves the website. Processes your IP address and request logs.</li>
          <li><strong>NOWPayments</strong> &mdash; processes cryptocurrency payments.</li>
          <li><strong>Stripe</strong> &mdash; processes card payments where card checkout is enabled.</li>
          <li><strong>Porkbun</strong> &mdash; delivers our email: order confirmations, shipping updates and password resets.</li>
          <li><strong>Resend</strong> &mdash; alternative email delivery provider, used when configured.</li>
          <li><strong>Google Analytics</strong> &mdash; site usage statistics. Loaded only if you accept analytics cookies.</li>
          <li><strong>Shipping carriers</strong> &mdash; receive your name and address to deliver your order.</li>
          <li><strong>Law enforcement</strong> &mdash; only where required by valid legal process.</li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          When you first visit, we ask whether you accept analytics cookies. Nothing optional is
          set until you answer, and declining means the analytics scripts are never loaded at
          all. You can change your answer at any time using the <strong>Cookie settings</strong>
          link in the footer.
        </p>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Optional?</th></tr>
          </thead>
          <tbody>
            <tr><td><code>sb-*</code></td><td>Keeps you signed in</td><td>Session</td><td>Required</td></tr>
            <tr><td><code>cart_id</code></td><td>Remembers your cart</td><td>7 days</td><td>Required</td></tr>
            <tr><td><code>mp_cookie_consent</code></td><td>Stores your cookie choice</td><td>1 year</td><td>Required</td></tr>
            <tr><td><code>_ga</code>, <code>_ga_*</code></td><td>Google Analytics usage statistics</td><td>Up to 2 years</td><td>Only with consent</td></tr>
          </tbody>
        </table>
        <p>
          The three required cookies are strictly necessary to sign in and check out, and are
          exempt from consent requirements. Without them the store cannot function.
        </p>

        <h2>5. Data Retention</h2>
        <ul>
          <li><strong>Order records</strong> &mdash; 7 years, for tax and legal compliance</li>
          <li><strong>Account information</strong> &mdash; while your account is active</li>
          <li><strong>Abandoned cart records</strong> &mdash; deleted with the cart once it expires</li>
          <li><strong>Newsletter subscriptions</strong> &mdash; until you unsubscribe</li>
          <li><strong>Abuse-prevention IP records</strong> &mdash; cleared automatically once the rate-limit window passes, at most a few hours</li>
          <li><strong>Payment webhook records</strong> &mdash; retained with the order, to prevent duplicate processing</li>
        </ul>
        <p>
          You may request deletion of your account and associated data at any time. We may have
          to keep order records that tax law requires us to retain.
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
          <a href="mailto:support@midwesternpeptides.com" className="text-brand-600">
            support@midwesternpeptides.com
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
          <a href="mailto:support@midwesternpeptides.com" className="text-brand-600">
            support@midwesternpeptides.com
          </a>
        </p>
      </div>
    </main>
  )
}
