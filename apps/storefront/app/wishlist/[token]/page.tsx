import Link from "next/link"
import type { Metadata } from "next"
import { Heart } from "lucide-react"
import { getWishlistByShareToken } from "@/lib/wishlist"
import { formatPrice } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Shared Wishlist",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ token: string }>
}

export default async function SharedWishlistPage({ params }: Props) {
  const { token } = await params
  const wishlist = await getWishlistByShareToken(token)

  if (!wishlist || wishlist.items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400">
          <Heart size={22} strokeWidth={1.5} />
        </span>
        <h1 className="text-xl font-semibold text-gray-700">
          This wishlist is empty or no longer available
        </h1>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Browse Products
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-sand-500">
          Shared wishlist
        </p>
        <h1 className="text-3xl font-bold text-sand-900">A researcher&apos;s picks</h1>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.items.map((item) => {
          const product = item.product
          const lowest = [...product.variants].sort(
            (a, b) => a.price_cents - b.price_cents
          )[0]
          return (
            <Link key={item.id} href={`/products/${product.handle}`} className="group block">
              <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-sand-200 bg-[#F0F5F0] transition-colors group-hover:border-brand-300">
                {product.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="select-none font-mono text-4xl font-bold text-brand-200">
                    {product.title.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium leading-tight text-sand-900 transition-colors group-hover:text-brand-700">
                {product.title}
              </p>
              {lowest && (
                <p className="mt-1 text-sm font-semibold text-sand-800">
                  From {formatPrice(lowest.price_cents)}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </main>
  )
}
