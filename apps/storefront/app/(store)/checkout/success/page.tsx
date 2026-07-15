import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ order_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order_id } = await searchParams

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8 text-center">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
      <p className="mt-3 text-gray-500">
        Thank you for your order. You'll receive a confirmation email shortly.
      </p>

      {order_id && (
        <p className="mt-2 text-sm text-gray-400">
          Order ID:{" "}
          <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            {order_id}
          </code>
        </p>
      )}

      {/* What happens next */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-left">
        <h2 className="font-semibold text-gray-900 mb-4">What happens next?</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">1</span>
            <span>You'll receive an order confirmation email within a few minutes.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">2</span>
            <span>Our team will process and prepare your order (usually same business day).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">3</span>
            <span>You'll receive a shipping confirmation with tracking information via email.</span>
          </li>
        </ol>
      </div>

    

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {order_id && (
          <Link
            href={`/account/orders/${order_id}`}
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            View Order Details
          </Link>
        )}
        <Link
          href="/products"
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  )
}
