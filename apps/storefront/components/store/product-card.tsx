import Image from "next/image"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { SpecBadges } from "@/components/store/spec-badges"
import { CardAddToCart } from "@/components/store/card-add-to-cart"
import { WishlistButton } from "@/components/store/wishlist-button"

/** Shared by the featured grid and the catalog so both stay the same shape. */
export const PRODUCT_GRID_CLS = "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"

export type CardProduct = {
  handle: string
  title: string
  /** Marketing category label for the chip above the name. */
  label: string | null
  /** Lowest variant price; null when the product has no variants. */
  priceCents: number | null
  variantCount: number
  thumbnail: string | null
  inStock: boolean
  /** Set only when the product has exactly one size, so the card can add it. */
  onlyVariantId: string | null
  /** Merchandising ribbon — "Best seller", "New". */
  badge?: string | null
  /** Peptides claim purity and a COA; lab supplies have neither. */
  showSpecs?: boolean
}

/**
 * The single product tile used by the featured grid and the catalog. Keep it
 * client-safe — the home grid renders it inside a "use client" tree, so it must
 * not reach for anything server-only.
 */
export function ProductCard({
  product,
  wishlist,
}: {
  product: CardProduct
  /** Omitted where there is no signed-in user to save for. */
  wishlist?: { productId: string; initial: boolean }
}) {
  const href = `/products/${product.handle}`

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-sand-200 bg-white p-3.5 transition-colors hover:border-brand-300">
      <Link href={href} className="block">
        <div className="relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
          {product.badge && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-brand-600 px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-wide text-white">
              {product.badge}
            </span>
          )}
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="select-none font-mono text-4xl font-bold text-sand-400 transition-transform duration-300 group-hover:scale-110">
              {product.title.slice(0, 3).toUpperCase()}
            </span>
          )}
          {wishlist && (
            <WishlistButton
              productId={wishlist.productId}
              initial={wishlist.initial}
              className="absolute right-2.5 top-2.5 z-10"
            />
          )}
        </div>
      </Link>

      {product.label && (
        <div className="mb-2 flex justify-center">
          <span className="rounded-full bg-sand-100 px-2.5 py-1 font-mono text-2xs uppercase tracking-wide text-sand-600">
            {product.label}
          </span>
        </div>
      )}

      <Link href={href} className="block">
        <h3 className="text-center font-sans text-base font-semibold leading-snug tracking-normal text-sand-900 transition-colors group-hover:text-brand-700">
          {product.title}
        </h3>
      </Link>

      {product.showSpecs && (
        <div className="mt-3 flex justify-center">
          <SpecBadges purity="≥98% purity" />
        </div>
      )}

      {/* Price and action pinned to the bottom so cards line up. */}
      <div className="mt-auto pt-4">
        {product.priceCents != null && (
          <p className="mb-3 text-center leading-none">
            {product.variantCount > 1 && (
              <span className="mr-1.5 text-xs font-medium text-sand-600">From</span>
            )}
            <span className="text-xl font-bold text-sand-900">
              {formatPrice(product.priceCents)}
            </span>
            <span className="ml-1.5 text-xs font-medium text-sand-600">USD</span>
          </p>
        )}
        <CardAddToCart
          variantId={product.onlyVariantId}
          handle={product.handle}
          inStock={product.inStock}
        />
      </div>
    </article>
  )
}
