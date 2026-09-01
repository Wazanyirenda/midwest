import Link from "next/link"
import type { Metadata } from "next"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PaymentStatus } from "@/components/store/payment-status"

export const metadata: Metadata = {
  title: "Order Status",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type Props = {
  // Stripe appends payment_intent when it redirects for 3DS / bank auth.
  searchParams: Promise<{ order_id?: string; payment_intent?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { order_id, payment_intent } = await searchParams

  // Look the order up server-side. This page is a public URL — anyone can visit
  // it — so it reports payment state rather than asserting it.
  let orderId: string | null = null
  let status = "unknown"

  if (order_id) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("id", order_id)
      .maybeSingle()
    if (data) {
      orderId = data.id
      status = data.status
    }
  } else if (payment_intent) {
    // Redirect flow without our own param — recover via the PaymentIntent.
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("payment_reference", payment_intent)
      .maybeSingle()
    if (data) {
      orderId = data.id
      status = data.status
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
      {orderId ? (
        <PaymentStatus orderId={orderId} initialStatus={status} />
      ) : (
        <>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sand-100">
            <svg
              className="h-10 w-10 text-sand-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-sand-900">No order found</h1>
          <p className="mx-auto mt-3 max-w-md text-sand-600">
            We couldn&apos;t match this page to an order. If you were charged,
            nothing is lost — check your email or your account, and contact us if
            it doesn&apos;t appear.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/account/orders"
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              My orders
            </Link>
            <Link
              href="/products"
              className="rounded-lg border border-sand-300 px-6 py-3 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50"
            >
              Continue shopping
            </Link>
          </div>
        </>
      )}

      <div className="mt-10 rounded-xl border border-sand-200 bg-white p-6 text-left">
        <h2 className="mb-4 font-semibold text-sand-900">What happens next?</h2>
        <ol className="space-y-3 text-sm text-sand-600">
          {[
            "You'll receive an order confirmation email once payment clears.",
            "Our team prepares your order, usually the same business day.",
            "You'll get a shipping confirmation with tracking information.",
          ].map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
