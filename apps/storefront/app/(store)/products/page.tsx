import type { Metadata } from "next"
import Image from "next/image"
import { FlaskConical } from "lucide-react"
import { listProducts, lowestVariantPrice, CATEGORY_TAGS, type Product } from "@/lib/products"
import { formatPrice } from "@/lib/utils"
import { getUser } from "@/lib/auth"
import { getWishlistedProductIds } from "@/lib/wishlist"
import { WishlistButton } from "@/components/store/wishlist-button"
import { SpecBadges } from "@/components/store/spec-badges"
import { CardAddToCart } from "@/components/store/card-add-to-cart"
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
        <p className="font-mono text-2xs tracking-widest text-sand-600 uppercase mb-1">
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
            <p className="font-mono text-2xs tracking-widest text-sand-600 uppercase mb-1">
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
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const lowestPrice = lowestVariantPrice(product)
        const inStock = product.variants.some((v) => v.inventory_quantity > 0)
        // Only offer a one-click add when there is nothing to choose between.
        const onlyVariant = product.variants.length === 1 ? product.variants[0] : null

        return (
          <div
            key={product.id}
            className="group flex flex-col rounded-2xl border border-sand-200 bg-white p-3 transition-colors hover:border-brand-300"
          >
            <Link href={`/products/${product.handle}`} className="block">
              {/* Image area */}
              <div className="relative mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F0F5F0]">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title ?? ""}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="select-none font-mono text-4xl font-bold text-brand-200 transition-transform duration-300 group-hover:scale-110">
                    {product.title?.slice(0, 3).toUpperCase()}
                  </span>
                )}
                <WishlistButton
                  productId={product.id}
                  initial={wishlisted.has(product.id)}
                  className="absolute right-2 top-2"
                />
              </div>

              <p className="text-center text-sm font-semibold leading-tight text-sand-900 transition-colors group-hover:text-brand-700">
                {product.title}
              </p>
            </Link>

            {product.category === "peptide" && (
              <div className="mt-2.5 flex justify-center">
                <SpecBadges purity="≥99% purity" />
              </div>
            )}

            {/* Price and action pinned to the bottom so cards line up. */}
            <div className="mt-auto pt-3">
              {lowestPrice != null && (
                <p className="mb-2.5 text-center text-sm font-semibold text-sand-900">
                  {product.variants.length > 1 && (
                    <span className="font-normal text-sand-600">From </span>
                  )}
                  {formatPrice(lowestPrice)} USD
                </p>
              )}
              <CardAddToCart
                variantId={onlyVariant?.id ?? null}
                handle={product.handle}
                inStock={inStock}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
