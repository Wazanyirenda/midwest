import Link from "next/link"
import { AlertTriangle, CheckCircle2, XOctagon } from "lucide-react"
import type { LowStockRow } from "@/lib/admin-stats"

function AlertRow({ row, critical }: { row: LowStockRow; critical: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {/* Icon + label, never color alone */}
      {critical ? (
        <XOctagon size={15} strokeWidth={2} className="shrink-0 text-red-600" />
      ) : (
        <AlertTriangle size={15} strokeWidth={2} className="shrink-0 text-amber-600" />
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/products/${row.product_id}`}
          className="block truncate text-sm font-medium text-sand-900 hover:text-brand-700"
        >
          {row.product_title}
        </Link>
        <p className="truncate text-xs text-sand-500">
          {row.title} · <span className="font-mono">{row.sku}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            critical ? "text-red-600" : "text-amber-700"
          }`}
        >
          {critical ? "Out of stock" : `${row.inventory_quantity} left`}
        </p>
        <p className="text-xs text-sand-400">reorder at {row.reorder_point}</p>
      </div>
    </li>
  )
}

export function StockAlerts({
  lowStock,
  outOfStock,
}: {
  lowStock: LowStockRow[]
  outOfStock: LowStockRow[]
}) {
  const total = lowStock.length + outOfStock.length

  return (
    <section className="rounded-xl border border-sand-200 bg-white">
      <header className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-sand-900">
          Stock alerts
          {total > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
              {total}
            </span>
          )}
        </h2>
        <Link
          href="/admin/inventory"
          className="text-xs text-brand-600 hover:underline"
        >
          Manage stock →
        </Link>
      </header>

      {total === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-sand-500">
          <CheckCircle2 size={16} strokeWidth={2} className="text-brand-600" />
          Every variant is above its reorder point.
        </p>
      ) : (
        <ul className="divide-y divide-sand-100">
          {/* Out of stock first — it's actively costing sales */}
          {outOfStock.map((row) => (
            <AlertRow key={row.id} row={row} critical />
          ))}
          {lowStock.map((row) => (
            <AlertRow key={row.id} row={row} critical={false} />
          ))}
        </ul>
      )}
    </section>
  )
}
