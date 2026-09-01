import { requireAdminOrRedirect } from "@/lib/admin"
import Link from "next/link"
import Image from "next/image"
import { Plus, ImageOff } from "lucide-react"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { formatCartTotal } from "@/lib/cart"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  title: string
  handle: string
  category: string
  status: "draft" | "published"
  thumbnail: string | null
  variants: Array<{
    id: string
    price_cents: number
    inventory_quantity: number
    reorder_point: number
  }>
}

export default async function AdminProductsPage() {
  await requireAdminOrRedirect()

  const { data } = await supabase
    .from("products")
    .select(
      "id,title,handle,category,status,thumbnail," +
        "variants:product_variants(id,price_cents,inventory_quantity,reorder_point)"
    )
    .order("category")
    .order("title")

  const products = (data ?? []) as unknown as Row[]

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sand-900">Products</h1>
          <p className="mt-0.5 text-sm text-sand-500">
            {products.length} product{products.length === 1 ? "" : "s"} · click one to
            edit details, images, and variants
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus size={16} strokeWidth={2} />
          New product
        </Link>
      </header>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand-300 bg-white px-6 py-16 text-center">
          <p className="text-sm text-sand-500">No products yet.</p>
          <Link
            href="/admin/products/new"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Add your first product →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sand-200 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-sand-500">
              <tr className="border-b border-sand-100">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {products.map((p) => {
                const prices = p.variants.map((v) => v.price_cents)
                const low = prices.length ? Math.min(...prices) : 0
                const high = prices.length ? Math.max(...prices) : 0
                const stock = p.variants.reduce(
                  (n, v) => n + v.inventory_quantity,
                  0
                )
                const flagged = p.variants.some(
                  (v) => v.inventory_quantity <= v.reorder_point
                )

                return (
                  <tr key={p.id} className="group hover:bg-sand-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100">
                          {p.thumbnail ? (
                            <Image
                              src={p.thumbnail}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <ImageOff size={14} strokeWidth={1.75} className="text-sand-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sand-900 group-hover:text-brand-700">
                            {p.title}
                          </p>
                          <p className="truncate font-mono text-xs text-sand-400">
                            /{p.handle}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-sand-600">{p.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "published"
                            ? "bg-brand-50 text-brand-800"
                            : "bg-sand-100 text-sand-600"
                        }`}
                      >
                        {p.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sand-700">
                      {prices.length === 0
                        ? "—"
                        : low === high
                          ? formatCartTotal(low)
                          : `${formatCartTotal(low)}–${formatCartTotal(high)}`}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        flagged ? "text-amber-700" : "text-sand-700"
                      }`}
                    >
                      {stock}
                      {flagged && <span className="ml-1 text-amber-600">▲</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
