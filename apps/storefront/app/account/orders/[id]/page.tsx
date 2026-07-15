import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
}

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

// TODO Phase 07: replace with real Medusa order fetch
async function getOrder(_id: string, _email: string) {
  return null // Placeholder until Phase 07
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const email = user.emailAddresses[0]?.emailAddress ?? ""
  const order = await getOrder(id, email)

  if (!order) {
    // Show a "coming soon" placeholder rather than a hard 404
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/account" className="hover:text-gray-700">Account</Link>
          <span>/</span>
          <Link href="/account/orders" className="hover:text-gray-700">Orders</Link>
          <span>/</span>
          <span className="text-gray-900">Details</span>
        </nav>
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🔧</div>
          <h1 className="text-xl font-semibold text-gray-700">Order tracking coming soon</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Full order detail and tracking will be available in a future update.
            For order support, please contact us.
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

  // This block will render once Phase 07 wires up the real order data
  const o = order as {
    display_id: number
    created_at: string
    status: string
    total: number
    subtotal: number
    shipping_total: number
    tax_total: number
    payment_method: string
    tracking_number?: string
    shipping_address: {
      first_name: string; last_name: string
      address_1: string; address_2?: string
      city: string; province: string; postal_code: string
    }
    items: Array<{ id: string; title: string; quantity: number; unit_price: number }>
  }

  const statusStyle = STATUS_STYLES[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" }
  const currentStep = STATUS_STEPS.indexOf(o.status)

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
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

      {/* Progress tracker */}
      <div className="mb-8 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${i <= currentStep ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {i < currentStep ? "✓" : i + 1}
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
          <p className="mt-4 text-sm text-brand-600">
            📦 Tracking: <strong>{o.tracking_number}</strong>
          </p>
        )}
      </div>

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
          <address className="not-italic text-sm text-gray-600 space-y-0.5">
            <p>{o.shipping_address.first_name} {o.shipping_address.last_name}</p>
            <p>{o.shipping_address.address_1}</p>
            {o.shipping_address.address_2 && <p>{o.shipping_address.address_2}</p>}
            <p>{o.shipping_address.city}, {o.shipping_address.province} {o.shipping_address.postal_code}</p>
          </address>
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment</h2>
          <p className="text-sm text-gray-600">{o.payment_method}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
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
