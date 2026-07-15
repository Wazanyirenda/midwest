import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getCart, formatCartTotal } from "@/lib/cart"
import { CheckoutForm } from "@/components/store/checkout-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCart(), currentUser()])

  if (!cart || (cart.items?.length ?? 0) === 0) {
    redirect("/cart")
  }

  const items = (cart.items ?? []).map((item) => {
    type ItemWithProduct = typeof item & {
      variant?: { title?: string; product?: { title?: string } }
    }
    const i = item as ItemWithProduct
    const productTitle = i.variant?.product?.title ?? "Item"
    const variantTitle = i.variant?.title
    return {
      id: item.id,
      title: variantTitle ? `${productTitle} — ${variantTitle}` : productTitle,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }
  })

  const userEmail = user?.emailAddresses[0]?.emailAddress

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-10">Checkout</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        {/* Form — takes 3 of 5 cols */}
        <div className="lg:col-span-3">
          <CheckoutForm
            cartId={cart.id}
            cartTotal={cart.total ?? null}
            cartSubtotal={cart.subtotal ?? null}
            items={items}
            userEmail={userEmail}
          />
        </div>

        {/* Summary — takes 2 of 5 cols */}
        <aside className="lg:col-span-2">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 flex-1 pr-2">
                    {item.title}
                    <span className="ml-1 text-gray-400">× {item.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCartTotal((item.unit_price ?? 0) * (item.quantity ?? 1))}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCartTotal(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>TBD</span>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCartTotal(cart.total)}</span>
            </div>

            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>🔒 256-bit SSL encryption</p>
              <p>📦 Discreet plain packaging</p>
            
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
