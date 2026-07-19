import { redirect } from "next/navigation"
import { Lock, Package } from "lucide-react"
import { getCart, formatCartTotal } from "@/lib/cart"
import { getUser, getProfile } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { CheckoutForm, type CheckoutDefaults } from "@/components/store/checkout-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const [cart, user] = await Promise.all([getCart(), getUser()])

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

  // Pre-fill step 1 from the profile + default saved address.
  let defaults: CheckoutDefaults = {}
  let hasSavedAddress = false
  if (user) {
    const [profile, { data: address }] = await Promise.all([
      getProfile(user.id),
      supabaseAdmin
        .from("addresses")
        .select("first_name,last_name,phone,address_1,address_2,city,province,postal_code")
        .eq("user_id", user.id)
        .eq("is_default_shipping", true)
        .maybeSingle(),
    ])
    hasSavedAddress = !!address
    defaults = {
      email: user.email ?? undefined,
      firstName: address?.first_name ?? profile?.first_name ?? undefined,
      lastName: address?.last_name ?? profile?.last_name ?? undefined,
      phone: address?.phone ?? profile?.phone ?? undefined,
      address1: address?.address_1 ?? undefined,
      address2: address?.address_2 ?? undefined,
      city: address?.city ?? undefined,
      state: address?.province ?? undefined,
      zip: address?.postal_code ?? undefined,
    }
  }

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
            defaults={defaults}
            isSignedIn={!!user}
            hasSavedAddress={hasSavedAddress}
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

            <div className="mt-4 space-y-1.5 text-xs text-gray-400">
              <p className="flex items-center gap-1.5">
                <Lock size={12} strokeWidth={1.75} />
                256-bit SSL encryption
              </p>
              <p className="flex items-center gap-1.5">
                <Package size={12} strokeWidth={1.75} />
                Discreet plain packaging
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
