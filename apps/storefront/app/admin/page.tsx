import Link from "next/link"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { formatCartTotal } from "@/lib/cart"
import { getDashboardStats, getTopProducts, percentChange } from "@/lib/admin-stats"
import { StatusBadge } from "@/components/admin/status-badge"
import { StatTile } from "@/components/admin/stat-tile"
import { StockAlerts } from "@/components/admin/stock-alerts"
import { RevenueChart } from "@/components/admin/revenue-chart"

export const dynamic = "force-dynamic"

const WINDOW_DAYS = 30

export default async function AdminOverviewPage() {
  const [stats, topProducts, recentRes] = await Promise.all([
    getDashboardStats(WINDOW_DAYS),
    getTopProducts(WINDOW_DAYS),
    supabase
      .from("orders")
      .select("id,display_id,email,total_cents,status,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const recent = recentRes.data ?? []
  const vs = `vs prior ${WINDOW_DAYS} days`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          Trailing {WINDOW_DAYS} days
        </p>
      </header>

      {/* Attention first: anything out of stock is actively losing sales */}
      {(stats.outOfStock.length > 0 ||
        stats.cancellationRequests > 0 ||
        stats.stalePendingCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.outOfStock.length > 0 && (
            <Link
              href="/admin/inventory"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 hover:bg-red-100"
            >
              <strong>{stats.outOfStock.length}</strong>{" "}
              {stats.outOfStock.length === 1 ? "variant is" : "variants are"} out of
              stock →
            </Link>
          )}
          {stats.stalePendingCount > 0 && (
            <Link
              href="/admin/orders"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
            >
              <strong>{stats.stalePendingCount}</strong> order
              {stats.stalePendingCount === 1 ? "" : "s"} pending over an hour —
              check Stripe for a missed payment →
            </Link>
          )}
          {stats.cancellationRequests > 0 && (
            <Link
              href="/admin/orders"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
            >
              <strong>{stats.cancellationRequests}</strong> cancellation{" "}
              {stats.cancellationRequests === 1 ? "request" : "requests"} waiting →
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Revenue"
          value={formatCartTotal(stats.revenueCents)}
          delta={percentChange(stats.revenueCents, stats.revenuePrevCents)}
          deltaLabel={vs}
        />
        <StatTile
          label="Orders"
          value={String(stats.orderCount)}
          delta={percentChange(stats.orderCount, stats.orderCountPrev)}
          deltaLabel={vs}
        />
        <StatTile
          label="Average order"
          value={formatCartTotal(stats.aovCents)}
          hint={`${stats.unitsSold} units sold`}
        />
        <StatTile
          label="Catalog"
          value={String(stats.publishedCount)}
          hint={`${stats.productCount - stats.publishedCount} draft, ${stats.productCount} total`}
        />
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-5">
        <RevenueChart series={stats.series} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockAlerts lowStock={stats.lowStock} outOfStock={stats.outOfStock} />

        <section className="rounded-xl border border-sand-200 bg-white">
          <header className="border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-sand-900">Best sellers</h2>
          </header>
          {topProducts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-sand-600">
              No sales in this window yet.
            </p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {topProducts.map((p) => (
                <li
                  key={p.title}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-sand-800">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-sand-600">
                    {p.units} units
                  </span>
                  <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums text-sand-900">
                    {formatCartTotal(p.revenue_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-sand-200 bg-white">
        <header className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-sand-900">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs text-brand-600 hover:underline">
            View all →
          </Link>
        </header>
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-sand-600">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-sand-600">
                <tr className="border-b border-sand-100">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {recent.map((o) => (
                  <tr key={o.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-sand-700">
                      #{o.display_id}
                    </td>
                    <td className="px-4 py-2.5 text-sand-600">{o.email}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-sand-900">
                      {formatCartTotal(o.total_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-sand-600">
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
