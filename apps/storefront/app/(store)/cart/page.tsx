import Link from "next/link"
import Image from "next/image"
import { Lock, ShoppingCart, Trash2, BookmarkPlus, Minus, Plus } from "lucide-react"
import { getCart, formatCartTotal } from "@/lib/cart"
import { getSiteSettings } from "@/lib/settings"
import { PaymentBadges } from "@/components/store/payment-badges"
import { clearCart, removeLineItem, updateLineItemQuantity } from "@/app/actions/cart"
import { saveCartItemForLater } from "@/app/actions/wishlist"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: false },
}

export default async function CartPage() {
  const [cart, settings] = await Promise.all([getCart(), getSiteSettings()])

  const items = cart?.items ?? []
  const isEmpty = items.length === 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-sand-900">Your Cart</h1>
        {!isEmpty && (
          <form action={clearCart.bind(null, cart!.id)}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-4 py-2 text-xs font-medium text-sand-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Clear cart
            </button>
          </form>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sand-50 text-sand-600">
            <ShoppingCart size={26} strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-semibold text-sand-700">Your cart is empty</h2>
          <p className="mt-2 text-sand-600">Browse our catalog to add research peptides.</p>
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
                  className="flex gap-4 rounded-xl border border-sand-200 bg-white p-4"
                >
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-sand-100 overflow-hidden">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={productTitle}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-sand-300">
                        {productTitle.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${handle}`}
                      className="font-semibold text-sand-900 hover:text-brand-700 transition-colors"
                    >
                      {productTitle}
                    </Link>
                    {variantTitle && (
                      <p className="text-sm text-sand-600">{variantTitle}</p>
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
                          className="inline-flex items-center gap-1.5 text-xs text-sand-600 transition-colors hover:text-brand-600"
                        >
                          <BookmarkPlus size={14} strokeWidth={1.75} />
                          Save for later
                        </button>
                      </form>
                      <form
                        action={removeLineItem.bind(null, cart!.id, item.id)}
                      >
                        <button
                          type="submit"
                          aria-label={`Remove ${item.variant.product.title} from cart`}
                          className="inline-flex items-center gap-1.5 text-xs text-sand-600 transition-colors hover:text-red-600"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
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
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-sand-300 text-sand-600 transition-colors hover:border-brand-400 hover:text-brand-600"
                        >
                          <Minus size={14} strokeWidth={2} />
                        </button>
                      </form>
                      <span className="w-6 text-center text-sm font-medium text-sand-900">
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
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-sand-300 text-sand-600 transition-colors hover:border-brand-400 hover:text-brand-600"
                        >
                          <Plus size={14} strokeWidth={2} />
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
            <div className="sticky top-24 rounded-xl border border-sand-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-sand-900 mb-4">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-sand-600">
                  <span>Subtotal</span>
                  <span>{formatCartTotal(cart?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sand-600">
                  <span>Shipping</span>
                  <span className="text-sand-600">Calculated at checkout</span>
                </div>
                {(cart?.discount_total ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>−{formatCartTotal(cart?.discount_total)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-sand-200 pt-4 flex justify-between font-semibold text-sand-900">
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
                className="mt-3 block w-full rounded-lg border border-sand-300 py-3 text-center text-sm font-medium text-sand-700 hover:bg-sand-50 transition-colors"
              >
                Continue Shopping
              </Link>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-sand-600">
                <Lock size={12} strokeWidth={1.75} />
                Secure card checkout
              </p>

              {settings.showPaymentBadges && (
                <PaymentBadges
                  className="mt-3"
                  showApplePay={settings.showApplePayBadge}
                  showAmazonPay={settings.showAmazonPayBadge}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
