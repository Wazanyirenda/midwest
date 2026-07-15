import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { formatCartTotal } from "@/lib/cart"
import { StatusBadge } from "@/components/admin/status-badge"

export const dynamic = "force-dynamic"

const LOW_STOCK_THRESHOLD = 10

export default async function AdminOverviewPage() {
  const [ordersRes, lowStockRes, productCountRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id,display_id,email,total_cents,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("product_variants")
      .select("id,title,sku,inventory_quantity,product:products(title)")
      .lte("inventory_quantity", LOW_STOCK_THRESHOLD)
      .order("inventory_quantity"),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ])

  const orders = ordersRes.data ?? []
  type LowStockRow = {
    id: string
    title: string
    sku: string
    inventory_quantity: number
    product: { title: string }
  }
  const lowStock = (lowStockRes.data ?? []) as unknown as LowStockRow[]

  return (
    <div className="space-y-10">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Products", value: productCountRes.count ?? 0 },
          { label: "Recent orders", value: orders.length },
          { label: "Low-stock variants", value: lowStock.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-sand-200 bg-sand-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-sand-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-sand-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Low stock */}
      <section>
        <h2 className="text-lg font-semibold text-sand-900 mb-3">
          Low stock (≤ {LOW_STOCK_THRESHOLD})
        </h2>
        {lowStock.length === 0 ? (
          <p className="text-sm text-sand-500">All variants above threshold. 👍</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-sand-200">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">In stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {lowStock.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-medium text-sand-900">{v.product.title}</td>
                    <td className="px-4 py-3 text-sand-600">{v.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sand-500">{v.sku}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${v.inventory_quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                      {v.inventory_quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent orders */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-sand-900">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-sand-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-sand-200">
            <table className="w-full text-sm">
              <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs text-sand-700">#{o.display_id}</td>
                    <td className="px-4 py-3 text-sand-600">{o.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-sand-900">
                      {formatCartTotal(o.total_cents)}
                    </td>
                    <td className="px-4 py-3 text-sand-500">
                      {new Date(o.created_at).toLocaleDateString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
