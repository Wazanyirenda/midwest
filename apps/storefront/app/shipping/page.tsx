import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Midwestern Peptides shipping information — processing times, carriers, and delivery details.",
}

export default function ShippingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Shipping Policy</h1>

      <div className="mt-8 space-y-8">
        {/* Processing */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Processing Time</h2>
          <div className="space-y-2 text-gray-600">
            <p>Orders placed before <strong>2:00 PM CT</strong> on business days are processed same day.</p>
            <p>Orders placed after 2:00 PM CT or on weekends/holidays are processed the next business day.</p>
            <p>You will receive an email with tracking information once your order ships.</p>
          </div>
        </section>

        {/* Domestic */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Domestic Shipping (USA)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left font-semibold text-gray-700">Method</th>
                  <th className="pb-2 text-left font-semibold text-gray-700">Carrier</th>
                  <th className="pb-2 text-left font-semibold text-gray-700">Estimated Delivery</th>
                  <th className="pb-2 text-right font-semibold text-gray-700">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                <tr>
                  <td className="py-3">Standard Shipping</td>
                  <td>USPS Priority / UPS Ground</td>
                  <td>3–5 business days</td>
                  <td className="text-right">$9.95</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-green-700">Free Shipping</td>
                  <td>USPS Priority / UPS Ground</td>
                  <td>3–5 business days</td>
                  <td className="text-right font-medium text-green-700">Orders over $200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Packaging */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Discreet Packaging</h2>
          <p className="text-gray-600">
            All orders are shipped in plain, unmarked packaging. There is no mention of
            Midwestern Peptides or the nature of the products on the exterior of the package.
            The return address will show our fulfillment address only.
          </p>
        </section>

        {/* Temperature */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Temperature Considerations</h2>
          <p className="text-gray-600">
            Lyophilized (freeze-dried) peptides are stable at room temperature for short transit periods.
            For optimal research results, store at 2–8°C (refrigerated) upon receipt.
            Extended storage should be at −20°C or lower.
          </p>
        </section>

        {/* International */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">International Shipping</h2>
          <p className="text-gray-600">
            We currently ship within the United States only. Sign up for our
            newsletter to hear when international shipping becomes available.
          </p>
        </section>

        {/* Issues */}
        <section className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Issues with Your Order</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong className="text-gray-700">Lost package:</strong> If tracking shows delivered but you
              haven't received it, wait 24 hours and then contact us. We'll work with the carrier to
              locate the package.
            </p>
            <p>
              <strong className="text-gray-700">Damaged package:</strong> Take photos immediately and
              contact us within 7 days of delivery. We will file a claim with the carrier and
              arrange a replacement.
            </p>
            <p>
              <strong className="text-gray-700">Wrong item:</strong> Contact us within 7 days of
              delivery and we'll make it right.
            </p>
          </div>
          <p className="mt-4 text-sm">
            Contact:{" "}
            <a href="mailto:shipping@midwesternpeptides.com" className="text-brand-600 hover:underline">
              shipping@midwesternpeptides.com
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
