import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Midwestern Peptides refund and returns policy — cancellations, damaged or incorrect orders, and how card and crypto refunds are issued.",
}

const LAST_UPDATED = "September 8, 2026"

export default function RefundsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-sand-900">Refund Policy</h1>
      <p className="mt-2 text-sm text-sand-600">Last updated: {LAST_UPDATED}</p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Before you order:</strong> orders paid in cryptocurrency are refunded as{" "}
        <strong>store credit</strong>, not returned to your wallet. Blockchain payments cannot be
        reversed by us once confirmed.
      </div>

      <div className="mt-8 prose prose-gray max-w-none">
        <h2>1. Opened products cannot be returned</h2>
        <p>
          These are research chemicals. Once a vial has left our custody and its seal is broken,
          we cannot verify its storage conditions, handling, or identity, and it cannot re-enter
          inventory. Opened products are therefore not returnable under any circumstances.
        </p>

        <h2>2. Cancelling before dispatch</h2>
        <p>
          An order that has not yet shipped can be cancelled in full. Email us with your order
          number as soon as possible — orders are dispatched within 1&ndash;2 business days of
          payment confirmation, so the window is short. Once a tracking number is issued the
          order can no longer be cancelled.
        </p>

        <h2>3. Damaged, incorrect, or missing items</h2>
        <p>
          If your order arrives damaged, incorrect, or incomplete, contact us{" "}
          <strong>within 7 days of delivery</strong> with your order number and photographs of
          the packaging and its contents. Where we are at fault we will replace the item or
          refund it — your choice. We may ask you to return the item, at our expense, before a
          replacement is dispatched.
        </p>
        <p>
          Report damage before opening or attempting to use the product where possible.
          Photographs taken at the moment of delivery are the most useful evidence.
        </p>

        <h2>4. How refunds are issued</h2>
        <p>
          Approved refunds are returned by the same method you paid with, with one exception:
        </p>
        <ul>
          <li>
            <strong>Card payments</strong> are refunded to the original card and appear within
            5&ndash;10 business days, depending on your bank. We do not control that timing.
          </li>
          <li>
            <strong>Cryptocurrency payments</strong> are refunded as{" "}
            <strong>store credit</strong> applied to your account, not returned on-chain. A
            confirmed blockchain transaction is irreversible, and returning funds to a wallet we
            cannot verify as yours carries a risk we are not able to take. Store credit does not
            expire and can be used against any future order.
          </li>
        </ul>

        <h2>5. Underpaid crypto orders</h2>
        <p>
          Crypto payments are sent from your own wallet, and network fees mean the amount that
          arrives is sometimes slightly below the invoice. Small shortfalls inside our tolerance
          are accepted automatically. A larger shortfall places the order under review rather
          than cancelling it: we will contact you to either collect the difference or issue
          store credit for the amount received.
        </p>

        <h2>6. Overpayments</h2>
        <p>
          Any amount received above the invoice total is issued as store credit.
        </p>

        <h2>7. What is not refundable</h2>
        <ul>
          <li>Opened or unsealed products (see section 1)</li>
          <li>Shipping charges, once an order has been dispatched</li>
          <li>Orders refused at delivery, or returned because an address was entered incorrectly</li>
          <li>Products damaged by storage or handling after delivery</li>
        </ul>

        <h2>8. Chargebacks</h2>
        <p>
          Please contact us before opening a dispute with your bank. Almost every issue is faster
          to resolve directly, and a chargeback filed without contacting us first may result in
          your account being closed to future orders.
        </p>

        <h2>9. How to make a request</h2>
        <p>
          Email{" "}
          <a href="mailto:support@midwesternpeptides.com" className="text-brand-700">
            support@midwesternpeptides.com
          </a>{" "}
          with your order number and, where relevant, photographs. We aim to respond within two
          business days.
        </p>

        <h2>10. Related policies</h2>
        <p>
          See our <Link href="/terms">Terms of Service</Link>,{" "}
          <Link href="/shipping">Shipping Policy</Link>, and{" "}
          <Link href="/disclaimer">Research Use Disclaimer</Link>.
        </p>

        <h2>11. Contact</h2>
        <p>
          Midwestern Peptides LLC — North Dakota, USA
          <br />
          Email:{" "}
          <a href="mailto:support@midwesternpeptides.com" className="text-brand-700">
            support@midwesternpeptides.com
          </a>
        </p>
      </div>
    </main>
  )
}
