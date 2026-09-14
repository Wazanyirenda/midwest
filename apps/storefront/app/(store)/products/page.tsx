import type { Metadata } from "next"
import { FlaskConical } from "lucide-react"
import {
  listProducts,
  lowestVariantPrice,
  categoryLabel,
  categorySlug,
  CATEGORY_TAGS,
  type Product,
} from "@/lib/products"
import { getUser } from "@/lib/auth"
import { getWishlistedProductIds } from "@/lib/wishlist"
import { ProductCard, PRODUCT_GRID_CLS } from "@/components/store/product-card"
import { categoryStyle } from "@/components/store/category-style"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Research Peptides",
  description: "Browse our catalog of high-purity research peptides.",
}

// Wishlist hearts are per-user — render per request.
export const dynamic = "force-dynamic"


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
        <p className="font-mono text-xs font-semibold tracking-widest text-sand-600 uppercase mb-1">
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
                ? categoryStyle(slug).chip
                : "border-sand-300 text-sand-600 hover:border-sand-400 hover:text-sand-900"
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
          <p className="mt-2 text-sm text-sand-600 max-w-sm">
            {hasFilter
              ? "Try a different search term or browse all products."
              : "Our catalog is being set up. Check back shortly or "}
            {!hasFilter && (
              <a href="mailto:support@midwesternpeptides.com" className="text-brand-600 hover:underline">
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
            <p className="font-mono text-xs font-semibold tracking-widest text-sand-600 uppercase mb-1">
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
    <div className={PRODUCT_GRID_CLS}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            handle: product.handle,
            title: product.title,
            label: categoryLabel(product),
            labelSlug: categorySlug(product),
            priceCents: lowestVariantPrice(product),
            variantCount: product.variants.length,
            thumbnail: product.thumbnail,
            showSpecs: product.category === "peptide",
            // Only offer a one-click add when there is nothing to choose between.
            onlyVariantId: product.variants.length === 1 ? (product.variants[0]?.id ?? null) : null,
            inStock: product.variants.some((v) => v.inventory_quantity > 0),
          }}
          wishlist={{ productId: product.id, initial: wishlisted.has(product.id) }}
        />
      ))}
    </div>
  )
}
