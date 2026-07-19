import Link from "next/link"
import type { Metadata } from "next"
import { Check, PackageSearch, Truck } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { getOrderById, carrierTrackingUrl } from "@/lib/orders"
import { ReorderButton } from "@/components/store/reorder-button"
import { CancelRequestButton } from "@/components/store/cancel-request-button"

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_STEPS = ["pending", "processing", "shipped", "delivered"]

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending Payment", cls: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700" },
  canceled: { label: "Canceled", cls: "bg-red-100 text-red-700" },
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await requireUser("/account/orders")
  const o = await getOrderById(id, user)

  if (!o) {
    return (
      <main>
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/account" className="hover:text-gray-700">Account</Link>
          <span>/</span>
          <Link href="/account/orders" className="hover:text-gray-700">Orders</Link>
          <span>/</span>
          <span className="text-gray-900">Details</span>
        </nav>
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-gray-300 bg-white">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400">
            <PackageSearch size={22} strokeWidth={1.5} />
          </span>
          <h1 className="text-xl font-semibold text-gray-700">We couldn&apos;t find that order</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            The order may belong to a different account, or the link is out of
            date. For order support, please contact us.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/account/orders"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back to Orders
            </Link>
            <a
              href="mailto:support@midwesternpeptides.com"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>
    )
  }

  const statusStyle = STATUS_STYLES[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" }
  const currentStep = STATUS_STEPS.indexOf(o.status)
  const isCanceled = o.db_status === "canceled"
  const canRequestCancel =
    ["pending", "paid"].includes(o.db_status) && !o.cancellation_requested_at
  const trackingUrl = carrierTrackingUrl(o.tracking_carrier, o.tracking_number)

  return (
    <main>
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/account" className="hover:text-gray-700">Account</Link>
        <span>/</span>
        <Link href="/account/orders" className="hover:text-gray-700">Orders</Link>
        <span>/</span>
        <span className="text-gray-900">#{o.display_id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{o.display_id}</h1>
          <p className="mt-1 text-sm text-gray-500">Placed {formatDate(o.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.cls}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Progress tracker / canceled banner */}
      {isCanceled ? (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          This order was canceled. If you were charged, the refund will arrive
          within 5–10 business days. Questions?{" "}
          <a href="mailto:support@midwesternpeptides.com" className="font-medium underline">
            Contact support
          </a>
          .
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${i <= currentStep ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {i < currentStep ? <Check size={13} strokeWidth={2.5} /> : i + 1}
                  </div>
                  <span className={`mt-1 text-xs capitalize hidden sm:block ${i <= currentStep ? "text-brand-700 font-medium" : "text-gray-400"}`}>
                    {s}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-[-1rem] mx-2 ${i < currentStep ? "bg-brand-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          {o.tracking_number && (
            <p className="mt-4 flex items-center gap-2 text-sm text-brand-600">
              <Truck size={15} strokeWidth={1.75} />{" "}
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Track shipment ({o.tracking_carrier?.toUpperCase()} {o.tracking_number})
                </a>
              ) : (
                <>Tracking: <strong>{o.tracking_number}</strong></>
              )}
            </p>
          )}
        </div>
      )}

      {o.cancellation_requested_at && !isCanceled && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Cancellation requested on {formatDate(o.cancellation_requested_at)} —
          we&apos;ll review it before the order ships.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Items */}
        <div className="sm:col-span-2 rounded-xl border border-gray-200 overflow-hidden">
          <h2 className="bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
            Items Ordered
          </h2>
          <div className="divide-y divide-gray-100">
            {o.items.map((item) => (
              <div key={item.id} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-800">{item.title} × {item.quantity}</span>
                <span className="font-medium text-gray-900">{formatAmount(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="px-5 py-3 space-y-1 bg-gray-50 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatAmount(o.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{formatAmount(o.shipping_total)}</span></div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatAmount(o.total)}</span></div>
            </div>
          </div>
        </div>

        {/* Shipping address */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ship To</h2>
          {o.shipping_address ? (
            <address className="not-italic text-sm text-gray-600 space-y-0.5">
              <p>{o.shipping_address.first_name} {o.shipping_address.last_name}</p>
              <p>{o.shipping_address.address_1}</p>
              {o.shipping_address.address_2 && <p>{o.shipping_address.address_2}</p>}
              <p>{o.shipping_address.city}, {o.shipping_address.province} {o.shipping_address.postal_code}</p>
            </address>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment</h2>
          <p className="text-sm text-gray-600">{o.payment_method}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!isCanceled && <ReorderButton orderId={o.id} />}
        <Link
          href={`/account/orders/${o.id}/invoice`}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Invoice
        </Link>
        {canRequestCancel && <CancelRequestButton orderId={o.id} />}
        <Link
          href="/account/orders"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← All Orders
        </Link>
        <a
          href="mailto:support@midwesternpeptides.com"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Need help?
        </a>
      </div>
    </main>
  )
}
