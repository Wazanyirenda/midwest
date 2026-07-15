import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Midwestern Peptides Terms of Service — read before purchasing.",
}

const LAST_UPDATED = "May 24, 2026"

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Important:</strong> By accessing this website or placing an order, you agree to
        these Terms. Please read them carefully.
      </div>

      <div className="mt-8 prose prose-gray max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Midwestern Peptides website ("Site") or purchasing our products,
          you agree to be bound by these Terms of Service and our Privacy Policy. If you do not
          agree, do not use this Site.
        </p>

        <h2>2. Eligibility & Research Use Requirement</h2>
        <p>
          You must be at least <strong>21 years of age</strong> to purchase from Midwestern Peptides.
          By placing an order, you represent and warrant that:
        </p>
        <ul>
          <li>You are 21 years of age or older</li>
          <li>You are a qualified researcher, scientist, or purchasing for legitimate laboratory research</li>
          <li>You will use the products exclusively for lawful scientific research purposes</li>
          <li>You will <strong>not</strong> use the products for human or animal consumption</li>
          <li>You understand these products are not approved by the FDA for any therapeutic use</li>
        </ul>

        <h2>3. Research Use Only — No Medical Claims</h2>
        <p>
          All products sold by Midwestern Peptides LLC are sold strictly as research chemicals
          for laboratory use. We make <strong>no medical claims</strong> regarding any product.
          These statements have not been evaluated by the Food and Drug Administration.
          Our products are not intended to diagnose, treat, cure, or prevent any disease
          or medical condition.
        </p>

        <h2>4. Orders & Payment</h2>
        <ul>
          <li>All prices are listed in USD and are subject to change without notice</li>
          <li>We reserve the right to cancel any order at our discretion</li>
          <li>Orders are not confirmed until payment is successfully processed</li>
          <li>For crypto payments, orders are held until blockchain confirmation is received</li>
        </ul>

        <h2>5. Shipping & Delivery</h2>
        <p>
          Orders are shipped within 1–2 business days of payment confirmation.
          We are not responsible for delays caused by shipping carriers or customs.
          Risk of loss transfers to you upon delivery to the carrier.
          See our <a href="/shipping" className="text-brand-600">Shipping Policy</a> for full details.
        </p>

        <h2>6. Returns & Refunds</h2>
        <p>
          Due to the nature of research chemicals, we do not accept returns of opened products.
          If you receive a damaged or incorrect product, contact us within 7 days of delivery.
          Crypto payments are <strong>non-refundable</strong> due to the nature of blockchain transactions.
          Card payment refunds are processed within 5–10 business days if approved.
        </p>

        <h2>7. Prohibited Uses</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Purchase products for personal use, self-administration, or human consumption</li>
          <li>Resell our products for human consumption purposes</li>
          <li>Make medical or therapeutic claims about our products</li>
          <li>Use our products in violation of any applicable law or regulation</li>
          <li>Use our website for fraudulent purposes</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Midwestern Peptides LLC shall not be liable
          for any indirect, incidental, special, or consequential damages arising from your
          use of our products or website. Our total liability shall not exceed the amount
          paid for the specific order giving rise to the claim.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Midwestern Peptides LLC, its officers,
          directors, employees, and agents from any claims, damages, or expenses arising
          from your violation of these Terms or misuse of our products.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of North Dakota, USA, without
          regard to conflict of law principles. Any disputes shall be resolved in the courts
          of North Dakota.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may update these Terms at any time. Material changes will be indicated by
          updating the "Last updated" date. Continued use of the Site constitutes acceptance.
        </p>

        <h2>12. Contact</h2>
        <p>
          Midwestern Peptides LLC — North Dakota, USA<br />
          Email:{" "}
          <a href="mailto:legal@midwesternpeptides.com" className="text-brand-600">
            legal@midwesternpeptides.com
          </a>
        </p>
      </div>
    </main>
  )
}
