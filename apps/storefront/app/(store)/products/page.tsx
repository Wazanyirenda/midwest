import type { Metadata } from "next"
import { FlaskConical } from "lucide-react"
import { listProducts, lowestVariantPrice, CATEGORY_TAGS, type Product } from "@/lib/products"
import { formatPrice } from "@/lib/utils"
import { getUser } from "@/lib/auth"
import { getWishlistedProductIds } from "@/lib/wishlist"
import { WishlistButton } from "@/components/store/wishlist-button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Research Peptides",
  description: "Browse our catalog of high-purity research peptides.",
}

// Wishlist hearts are per-user — render per request.
export const dynamic = "force-dynamic"

const PURITY_DOTS = 4

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const tag = category && CATEGORY_TAGS[category] ? category : undefined

  const [products, user] = await Promise.all([listProducts({ q, tag }), getUser()])
  const wishlisted = user ? await getWishlistedProductIds(user.id) : new Set<string>()

  const peptides = products.filter((p) => p.category === "peptide")
  const equipment = products.filter((p) => p.category === "equipment")
  const hasFilter = !!q || !!tag

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Page title */}
      <div className="mb-6">
        <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
          Available now
        </p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-sand-900">
            {tag ? CATEGORY_TAGS[tag] : "Research Peptides"}
          </h1>
          {hasFilter && (
            <Link href="/products" className="text-xs font-mono text-brand-700 hover:text-brand-800 underline underline-offset-2">
              Clear {q ? "search" : "filter"} →
            </Link>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-10 flex flex-wrap gap-2">
        {Object.entries(CATEGORY_TAGS).map(([slug, label]) => (
          <Link
            key={slug}
            href={tag === slug ? "/products" : `/products?category=${slug}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tag === slug
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-sand-300 text-sand-600 hover:border-brand-400 hover:text-brand-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border-2 border-dashed border-sand-200 bg-sand-50">
          <span className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mb-4 text-brand-500">
            <FlaskConical size={26} strokeWidth={1.5} />
          </span>
          <h2 className="text-lg font-semibold text-sand-800">
            {q
              ? `No results for "${q}"`
              : tag
                ? `Nothing in ${CATEGORY_TAGS[tag]} right now`
                : "Products coming soon"}
          </h2>
          <p className="mt-2 text-sm text-sand-500 max-w-sm">
            {hasFilter
              ? "Try a different search term or browse all products."
              : "Our catalog is being set up. Check back shortly or "}
            {!hasFilter && (
              <a href="mailto:orders@midwesternpeptides.com" className="text-brand-600 hover:underline">
                contact us
              </a>
            )}
            {!hasFilter && " to place an order directly."}
          </p>
        </div>
      )}

      {peptides.length > 0 && (
        <ProductGrid products={peptides} wishlisted={wishlisted} />
      )}

      {equipment.length > 0 && (
        <>
          <div className="mt-14 mb-8">
            <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
              For your lab
            </p>
            <h2 className="text-2xl font-bold text-sand-900">Lab Supplies</h2>
          </div>
          <ProductGrid products={equipment} wishlisted={wishlisted} />
        </>
      )}
    </div>
  )
}

function ProductGrid({
  products,
  wishlisted,
}: {
  products: Product[]
  wishlisted: Set<string>
}) {
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
              <WishlistButton
                productId={product.id}
                initial={wishlisted.has(product.id)}
                className="absolute right-2 top-2"
              />
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
