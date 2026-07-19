import Link from "next/link"
import { Lock, ShoppingCart } from "lucide-react"
import { getCart, formatCartTotal } from "@/lib/cart"
import { removeLineItem, updateLineItemQuantity } from "@/app/actions/cart"
import { saveCartItemForLater } from "@/app/actions/wishlist"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: false },
}

export default async function CartPage() {
  const cart = await getCart()

  const items = cart?.items ?? []
  const isEmpty = items.length === 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sand-50 text-sand-400">
            <ShoppingCart size={26} strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-gray-700">Your cart is empty</h2>
          <p className="mt-2 text-gray-500">Browse our catalog to add research peptides.</p>
          <Link
            href="/products"
            className="mt-6 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Line items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              type ItemWithProduct = typeof item & {
                variant?: { title?: string; product?: { title?: string; handle?: string; thumbnail?: string } }
              }
              const i = item as ItemWithProduct
              const productTitle = i.variant?.product?.title ?? "Product"
              const variantTitle = i.variant?.title ?? ""
              const handle = i.variant?.product?.handle ?? ""
              const thumbnail = i.variant?.product?.thumbnail

              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4"
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt={productTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-gray-300">
                        {productTitle.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${handle}`}
                      className="font-semibold text-gray-900 hover:text-brand-700 transition-colors"
                    >
                      {productTitle}
                    </Link>
                    {variantTitle && (
                      <p className="text-sm text-gray-500">{variantTitle}</p>
                    )}
                    <p className="text-sm font-medium text-brand-600">
                      {formatCartTotal(item.unit_price)}
                    </p>
                  </div>

                  {/* Qty + Remove */}
                  <div className="flex flex-col items-end justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <form action={saveCartItemForLater.bind(null, cart!.id, item.id)}>
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
                        >
                          Save for later
                        </button>
                      </form>
                      <form
                        action={removeLineItem.bind(null, cart!.id, item.id)}
                      >
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center gap-2">
                      <form
                        action={updateLineItemQuantity.bind(
                          null,
                          cart!.id,
                          item.id,
                          (item.quantity ?? 1) - 1
                        )}
                      >
                        <button
                          type="submit"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          −
                        </button>
                      </form>
                      <span className="w-6 text-center text-sm font-medium text-gray-900">
                        {item.quantity}
                      </span>
                      <form
                        action={updateLineItemQuantity.bind(
                          null,
                          cart!.id,
                          item.id,
                          (item.quantity ?? 1) + 1
                        )}
                      >
                        <button
                          type="submit"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          +
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCartTotal(cart?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-gray-400">Calculated at checkout</span>
                </div>
                {(cart?.discount_total ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>−{formatCartTotal(cart?.discount_total)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4 flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCartTotal(cart?.total)}</span>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-lg bg-brand-600 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Proceed to Checkout →
              </Link>

              <Link
                href="/products"
                className="mt-3 block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </Link>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
                <Lock size={12} strokeWidth={1.75} />
                Secure card checkout
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
