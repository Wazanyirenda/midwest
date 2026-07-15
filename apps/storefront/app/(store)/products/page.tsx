import type { Metadata } from "next"
import { listProducts, lowestVariantPrice, type Product } from "@/lib/products"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Research Peptides",
  description: "Browse our catalog of high-purity research peptides.",
}

export const revalidate = 3600

async function getProducts(q?: string) {
  return listProducts(q)
}

const PURITY_DOTS = 4

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const products = await getProducts(q)
  const peptides = products.filter((p) => p.category === "peptide")
  const equipment = products.filter((p) => p.category === "equipment")

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Page title */}
      <div className="mb-10">
        <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
          Available now
        </p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-sand-900">Research Peptides</h1>
          {q && (
            <Link href="/products" className="text-xs font-mono text-brand-700 hover:text-brand-800 underline underline-offset-2">
              Clear search →
            </Link>
          )}
        </div>
        
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed border-sand-200 bg-sand-50">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mb-4 text-2xl">
            🧪
          </div>
          <h2 className="text-lg font-semibold text-sand-800">
            {q ? `No results for "${q}"` : "Products coming soon"}
          </h2>
          <p className="mt-2 text-sm text-sand-500 max-w-sm">
            {q
              ? "Try a different search term or browse all products."
              : "Our catalog is being set up. Check back shortly or "}
            {!q && (
              <a href="mailto:orders@midwesternpeptides.com" className="text-brand-600 hover:underline">
                contact us
              </a>
            )}
            {!q && " to place an order directly."}
          </p>
        </div>
      )}

      {peptides.length > 0 && (
        <ProductGrid products={peptides} />
      )}

      {equipment.length > 0 && (
        <>
          <div className="mt-14 mb-8">
            <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
              For your lab
            </p>
            <h2 className="text-2xl font-bold text-sand-900">Lab Supplies</h2>
          </div>
          <ProductGrid products={equipment} />
        </>
      )}
    </div>
  )
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const lowestPrice = lowestVariantPrice(product)

        return (
          <Link
            key={product.id}
            href={`/products/${product.handle}`}
            className="group block"
          >
            {/* Image area */}
            <div className="aspect-square w-full rounded-2xl bg-[#F0F5F0] border border-sand-200 group-hover:border-brand-300 flex items-center justify-center overflow-hidden relative transition-colors mb-3">
              {product.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.thumbnail}
                  alt={product.title ?? ""}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span className="font-mono text-4xl font-bold text-brand-200 group-hover:scale-110 transition-transform duration-300 select-none">
                  {product.title?.slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <p className="font-medium text-sand-900 group-hover:text-brand-700 transition-colors text-sm leading-tight">
              {product.title}
            </p>

            {/* Purity dots — peptides only */}
            {product.category === "peptide" && (
              <div className="flex items-center gap-1 mt-1.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: i < PURITY_DOTS ? "#16a34a" : "#d1d5db" }}
                  />
                ))}
                <span className="font-mono text-[10px] text-sand-400 ml-1">≥99% purity</span>
              </div>
            )}

            {lowestPrice != null && (
              <p className="mt-1 text-sm font-semibold text-sand-800">
                From {formatPrice(lowestPrice)}
              </p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
