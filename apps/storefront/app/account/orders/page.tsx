import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
}

// Status badge styling
const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", cls: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700" },
  canceled: { label: "Canceled", cls: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// TODO Phase 07: replace with real Medusa order fetch by customer email
async function getOrdersForUser(_email: string) {
  // Placeholder until Phase 07 wires up Medusa order API
  return []
}

export default async function OrdersPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const email = user.emailAddresses[0]?.emailAddress ?? ""
  const orders = await getOrdersForUser(email)

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/account" className="hover:text-gray-700">Account</Link>
        <span>/</span>
        <span className="text-gray-900">Orders</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-gray-700">No orders yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your order history will appear here after your first purchase.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as Array<{
            id: string
            display_id: number
            created_at: string
            status: string
            total: number
            items: Array<{ title: string; quantity: number }>
          }>).map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Order #{order.display_id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Placed {formatDate(order.created_at)}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {order.items.map((i) => `${i.title} × ${i.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">{formatAmount(order.total)}</p>
                  <p className="mt-1 text-xs text-brand-600">View details →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
