import Link from "next/link"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { StockAdjuster } from "@/components/admin/stock-adjuster"

export const dynamic = "force-dynamic"

const REASON_LABELS: Record<string, string> = {
  manual: "Manual",
  restock: "Restock",
  sale: "Sale",
  correction: "Correction",
  shrinkage: "Shrinkage",
}

type VariantRow = {
  id: string
  title: string
  sku: string
  inventory_quantity: number
  reorder_point: number
  product_id: string
  product: { title: string; status: string } | null
}

type HistoryRow = {
  id: string
  delta: number
  resulting_quantity: number
  reason: string
  note: string | null
  actor_email: string | null
  created_at: string
  variant: { title: string; sku: string; product: { title: string } | null } | null
}

export default async function AdminInventoryPage() {
  const [variantsRes, historyRes] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id,title,sku,inventory_quantity,reorder_point,product_id," +
          "product:products(title,status)"
      )
      .order("inventory_quantity"),
    supabase
      .from("inventory_adjustments")
      .select(
        "id,delta,resulting_quantity,reason,note,actor_email,created_at," +
          "variant:product_variants(title,sku,product:products(title))"
      )
      .order("created_at", { ascending: false })
      .limit(40),
  ])

  const variants = (variantsRes.data ?? []) as unknown as VariantRow[]
  const history = (historyRes.data ?? []) as unknown as HistoryRow[]

  const flagged = variants.filter((v) => v.inventory_quantity <= v.reorder_point)
  const totalUnits = variants.reduce((n, v) => n + v.inventory_quantity, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Inventory</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          {totalUnits} units across {variants.length} variants
          {flagged.length > 0 && (
            <>
              {" · "}
              <span className="font-medium text-amber-700">
                {flagged.length} at or below reorder point
              </span>
            </>
          )}
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-sand-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-sand-600">
            <tr className="border-b border-sand-100">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Variant</th>
              <th className="px-4 py-2.5 font-medium">SKU</th>
              <th className="px-4 py-2.5 text-right font-medium">In stock</th>
              <th className="px-4 py-2.5 text-right font-medium">Reorder at</th>
              <th className="px-4 py-2.5 font-medium">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {variants.map((v) => {
              const out = v.inventory_quantity === 0
              const low = !out && v.inventory_quantity <= v.reorder_point

              return (
                <tr
                  key={v.id}
                  className={out ? "bg-red-50/50" : low ? "bg-amber-50/50" : undefined}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${v.product_id}`}
                      className="font-medium text-sand-900 hover:text-brand-700"
                    >
                      {v.product?.title ?? "—"}
                    </Link>
                    {v.product?.status === "draft" && (
                      <span className="ml-1.5 rounded bg-sand-100 px-1.5 py-0.5 text-2xs text-sand-600">
                        draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sand-600">{v.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-sand-600">{v.sku}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        out ? "text-red-600" : low ? "text-amber-700" : "text-sand-900"
                      }`}
                    >
                      {v.inventory_quantity}
                    </span>
                    {out && (
                      <span className="ml-1.5 text-xs font-medium text-red-600">
                        out
                      </span>
                    )}
                    {low && (
                      <span className="ml-1.5 text-xs font-medium text-amber-700">
                        low
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sand-600">
                    {v.reorder_point}
                  </td>
                  <td className="px-4 py-3">
                    <StockAdjuster
                      variantId={v.id}
                      quantity={v.inventory_quantity}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-sand-200 bg-white">
        <header className="border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-sand-900">Recent adjustments</h2>
          <p className="mt-0.5 text-xs text-sand-600">
            Every stock change, newest first.
          </p>
        </header>

        {history.length === 0 ? (
          <p className="px-4 py-6 text-sm text-sand-600">
            No adjustments recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-sand-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={`w-14 shrink-0 text-right font-semibold tabular-nums ${
                    h.delta > 0 ? "text-brand-700" : "text-red-600"
                  }`}
                >
                  {h.delta > 0 ? "+" : ""}
                  {h.delta}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sand-800">
                    {h.variant?.product?.title ?? "Deleted product"}
                    <span className="text-sand-600"> · {h.variant?.title}</span>
                  </p>
                  <p className="truncate text-xs text-sand-600">
                    {REASON_LABELS[h.reason] ?? h.reason}
                    {h.note ? ` — ${h.note}` : ""}
                    {h.actor_email ? ` · ${h.actor_email}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-sand-600">
                  → {h.resulting_quantity}
                </span>
                <span className="hidden shrink-0 text-xs text-sand-600 sm:block">
                  {new Date(h.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
