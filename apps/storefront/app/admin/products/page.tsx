import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { updateProductStatus } from "@/app/actions/admin"
import { VariantEditor } from "@/components/admin/variant-editor"

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
    title: string
    sku: string
    price_cents: number
    inventory_quantity: number
  }>
}

export default async function AdminProductsPage() {
  const { data } = await supabase
    .from("products")
    .select(
      "id,title,handle,category,status,thumbnail," +
        "variants:product_variants(id,title,sku,price_cents,inventory_quantity)"
    )
    .order("category")
    .order("title")

  const products = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-4">
      <p className="text-sm text-sand-500">
        Edit prices and stock counts inline — changes save immediately and update the
        storefront. Unpublish a product to hide it from the store without deleting it.
      </p>

      {products.map((product) => (
        <div key={product.id} className="rounded-2xl border border-sand-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Thumb */}
            <div className="h-12 w-12 rounded-lg bg-sand-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {product.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-sand-400">
                  {product.title.slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-40">
              <p className="font-semibold text-sand-900">{product.title}</p>
              <p className="font-mono text-xs text-sand-400">
                /{product.handle} · {product.category}
              </p>
            </div>

            <form
              action={updateProductStatus.bind(
                null,
                product.id,
                product.status === "published" ? "draft" : "published"
              )}
            >
              <button
                type="submit"
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  product.status === "published"
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-sand-300 bg-sand-100 text-sand-500 hover:bg-sand-200"
                }`}
              >
                {product.status === "published" ? "● Published" : "○ Draft — click to publish"}
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-sand-400">
                <tr>
                  <th className="py-2 pr-4">Variant</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Price (USD)</th>
                  <th className="py-2 pr-4">In stock</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {product.variants.map((v) => (
                  <VariantEditor key={v.id} variant={v} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
