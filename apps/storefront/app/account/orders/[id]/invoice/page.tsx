import Link from "next/link"
import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { getOrderById } from "@/lib/orders"
import { PrintButton } from "@/components/store/print-button"

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params
  const user = await requireUser("/account/orders")
  const o = await getOrderById(id, user)

  if (!o) {
    return (
      <main className="py-24 text-center">
        <p className="text-gray-600">Order not found.</p>
        <Link href="/account/orders" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          ← Back to Orders
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl bg-white">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/account/orders/${o.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-gray-200 p-8 print:border-0 print:p-0">
        {/* Letterhead */}
        <div className="mb-8 flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <p className="text-lg font-bold text-gray-900">Midwestern Peptides</p>
            <p className="text-xs text-gray-500">orders@midwesternpeptides.com</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">Invoice</p>
            <p className="text-sm text-gray-500">Order #{o.display_id}</p>
            <p className="text-sm text-gray-500">{formatDate(o.created_at)}</p>
          </div>
        </div>

        {/* Bill / ship to */}
        <div className="mb-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-1 font-semibold text-gray-700">Billed to</p>
            <p className="text-gray-600">{o.email}</p>
          </div>
          {o.shipping_address && (
            <div>
              <p className="mb-1 font-semibold text-gray-700">Ship to</p>
              <address className="not-italic text-gray-600">
                <p>{o.shipping_address.first_name} {o.shipping_address.last_name}</p>
                <p>{o.shipping_address.address_1}</p>
                {o.shipping_address.address_2 && <p>{o.shipping_address.address_2}</p>}
                <p>{o.shipping_address.city}, {o.shipping_address.province} {o.shipping_address.postal_code}</p>
              </address>
            </div>
          )}
        </div>

        {/* Items */}
        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-700">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Unit</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {o.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-gray-800">{item.title}</td>
                <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                <td className="py-2 text-right text-gray-600">{formatAmount(item.unit_price)}</td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {formatAmount(item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatAmount(o.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Shipping</span>
            <span>{formatAmount(o.shipping_total)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-300 pt-1 font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatAmount(o.total)}</span>
          </div>
          <p className="pt-1 text-right text-xs text-gray-400">Paid via {o.payment_method}</p>
        </div>

        <p className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          All products are sold for laboratory research use only.
          Not for human or veterinary use.
        </p>
      </div>
    </main>
  )
}
