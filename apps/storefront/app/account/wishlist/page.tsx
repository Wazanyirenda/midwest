import Link from "next/link"
import type { Metadata } from "next"
import { Heart } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { getWishlistWithItems } from "@/lib/wishlist"
import { formatPrice } from "@/lib/utils"
import { WishlistItemActions } from "@/components/account/wishlist-item-actions"
import { ShareWishlistButton } from "@/components/account/share-wishlist-button"

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist")
  const wishlist = await getWishlistWithItems(user.id)

  return (
    <main>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wishlist</h1>
          <p className="mt-1 text-gray-500">
            Saved products — move them to your cart whenever you&apos;re ready.
          </p>
        </div>
        {wishlist.items.length > 0 && (
          <ShareWishlistButton shareToken={wishlist.share_token} />
        )}
      </div>

      {wishlist.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-24 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400">
            <Heart size={22} strokeWidth={1.5} />
          </span>
          <h2 className="text-lg font-semibold text-gray-700">Your wishlist is empty</h2>
          <p className="mt-2 text-sm text-gray-500">
            Tap the heart on any product to save it here.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.items.map((item) => {
            const product = item.product
            const savedVariant = product.variants.find((v) => v.id === item.variant_id)
            const lowest = [...product.variants].sort(
              (a, b) => a.price_cents - b.price_cents
            )[0]
            const price = savedVariant?.price_cents ?? lowest?.price_cents
            const inStock = product.variants.some((v) => v.inventory_quantity > 0)

            return (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <Link href={`/products/${product.handle}`} className="group block">
                  <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-sand-200 bg-[#F0F5F0]">
                    {product.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="select-none font-mono text-3xl font-bold text-brand-200">
                        {product.title.slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight text-gray-900 group-hover:text-brand-700">
                    {product.title}
                  </p>
                </Link>
                {savedVariant && (
                  <p className="mt-0.5 text-xs text-gray-500">{savedVariant.title}</p>
                )}
                <div className="mt-1 mb-3 flex items-center justify-between">
                  {price != null && (
                    <p className="text-sm font-semibold text-gray-800">
                      {savedVariant ? "" : "From "}
                      {formatPrice(price)}
                    </p>
                  )}
                  {!inStock && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Out of stock
                    </span>
                  )}
                </div>
                <WishlistItemActions itemId={item.id} />
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
