"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { updateCartContact } from "@/app/actions/cart"
import { initiatePaymentSession, addShippingMethod, listShippingOptions, completeCart } from "@/app/actions/checkout"
import { saveAddressFromCheckout } from "@/app/actions/addresses"
import { Field, inputCls } from "@/components/ui/form-field"
import { US_STATES } from "@/lib/us-states"

// ─── Stripe ───────────────────────────────────────────────────────────────────

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// ─── Schemas ──────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  email: z.string().email("Valid email required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().optional(),
  address1: z.string().min(1, "Address required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City required"),
  state: z.string().min(2, "State required").max(2, "Use 2-letter state code"),
  zip: z.string().min(5, "ZIP code required"),
  ageConfirmed: z.boolean().refine((v) => v === true, {
    message: "You must confirm you are 21+",
  }),
  saveAddress: z.boolean().optional(),
})

type ContactData = z.infer<typeof contactSchema>

export type CheckoutDefaults = Partial<
  Pick<
    ContactData,
    "email" | "firstName" | "lastName" | "phone" | "address1" | "address2" | "city" | "state" | "zip"
  >
>

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Contact & Shipping", "Review & Pay"]
  return (
    <ol className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <li key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors
                  ${done ? "bg-brand-600 border-brand-600 text-white"
                    : active ? "border-brand-600 text-brand-600 bg-white"
                    : "border-gray-300 text-gray-400 bg-white"}`}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : num}
              </div>
              <span className={`mt-1 hidden sm:block text-xs ${active ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[-1rem] mx-2 ${done ? "bg-brand-600" : "bg-gray-200"}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ─── Step 1: Contact + Shipping ───────────────────────────────────────────────

function Step1({
  onNext,
  defaults,
  isSignedIn,
  hasSavedAddress,
}: {
  onNext: (data: ContactData) => Promise<void>
  defaults: CheckoutDefaults
  isSignedIn: boolean
  hasSavedAddress: boolean
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ContactData>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(contactSchema as any),
      defaultValues: {
        ...defaults,
        ageConfirmed: false,
        // Default to saving when the user has no saved address yet.
        saveAddress: isSignedIn && !hasSavedAddress,
      },
    })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName?.message}>
          <input {...register("firstName")} className={inputCls} placeholder="Jane" />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input {...register("lastName")} className={inputCls} placeholder="Smith" />
        </Field>
      </div>

      <Field label="Email address" error={errors.email?.message}>
        <input {...register("email")} type="email" className={inputCls} placeholder="jane@university.edu" />
      </Field>

      <Field label="Phone (optional)" error={errors.phone?.message}>
        <input {...register("phone")} type="tel" className={inputCls} placeholder="+1 (555) 000-0000" />
      </Field>

      <hr className="border-gray-200" />
      <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>

      <Field label="Address line 1" error={errors.address1?.message}>
        <input {...register("address1")} className={inputCls} placeholder="123 Research Drive" />
      </Field>

      <Field label="Address line 2 (optional)" error={errors.address2?.message}>
        <input {...register("address2")} className={inputCls} placeholder="Suite 400" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Field label="City" error={errors.city?.message}>
            <input {...register("city")} className={inputCls} placeholder="Fargo" />
          </Field>
        </div>
        <Field label="State" error={errors.state?.message}>
          <select {...register("state")} className={inputCls}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="ZIP code" error={errors.zip?.message}>
          <input {...register("zip")} className={inputCls} placeholder="58102" />
        </Field>
      </div>

      {isSignedIn && (
        <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-600">
          <input
            {...register("saveAddress")}
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Save this address to my account for faster checkout</span>
        </label>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register("ageConfirmed")}
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-amber-800">
            I confirm I am <strong>21 years of age or older</strong>
          </span>
        </label>
        {errors.ageConfirmed && (
          <p className="mt-2 text-xs text-red-500">{errors.ageConfirmed.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Saving…" : "Review Order →"}
      </button>
    </form>
  )
}

// ─── Stripe payment form (used inside review step) ────────────────────────────

function StripePaymentForm({
  cartId,
  onSuccess,
  onBack,
}: {
  cartId: string
  onSuccess: (orderId: string) => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success` },
      redirect: "if_required",
    })

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed")
      setSubmitting(false)
      return
    }

    const result = await completeCart(cartId)
    if (result.type === "order") {
      onSuccess(result.order.id)
    } else {
      setError("Order could not be completed. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={submitting}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          ← Back
        </button>
        <button type="submit" disabled={submitting || !stripe}
          className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {submitting ? "Processing…" : "Pay with Card →"}
        </button>
      </div>
    </form>
  )
}

// ─── Step 2: Review + pay ─────────────────────────────────────────────────────

type CartSummary = {
  id: string
  total: number | null
  subtotal: number | null
  items: Array<{ id: string; title?: string; quantity?: number; unit_price?: number | null }>
}

function formatAmount(n: number | null | undefined) {
  if (n == null) return "$0.00"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100)
}

function ReviewStep({
  contact,
  cart,
  stripeClientSecret,
  onBack,
}: {
  contact: ContactData
  cart: CartSummary
  stripeClientSecret: string | null
  onBack: () => void
}) {
  const router = useRouter()

  function handleOrderSuccess(orderId: string) {
    router.push(`/checkout/success?order_id=${orderId}`)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Review Your Order</h2>

      <div className="rounded-lg border border-gray-200 p-4 space-y-1 text-sm">
        <div className="font-medium text-gray-700 mb-2">Shipping to</div>
        <p className="text-gray-900">{contact.firstName} {contact.lastName}</p>
        <p className="text-gray-600">{contact.address1}{contact.address2 ? `, ${contact.address2}` : ""}</p>
        <p className="text-gray-600">{contact.city}, {contact.state} {contact.zip}</p>
        <p className="text-gray-500">{contact.email}</p>
      </div>

      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
        {cart.items.map((item) => (
          <div key={item.id} className="flex justify-between p-4 text-sm">
            <span className="text-gray-800">{item.title ?? "Item"} × {item.quantity ?? 1}</span>
            <span className="font-medium text-gray-900">
              {formatAmount((item.unit_price ?? 0) * (item.quantity ?? 1))}
            </span>
          </div>
        ))}
        <div className="flex justify-between p-4 font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatAmount(cart.total)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        By placing this order you confirm you are 21+.
      </div>

      {stripeClientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
          <StripePaymentForm cartId={cart.id} onSuccess={handleOrderSuccess} onBack={onBack} />
        </Elements>
      ) : (
        <div className="flex gap-3">
          <button onClick={onBack}
            className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            ← Back
          </button>
          <button disabled
            className="flex-1 rounded-lg bg-gray-200 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed">
            Payment not available
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main checkout form ───────────────────────────────────────────────────────

type Props = {
  cartId: string
  cartTotal: number | null
  cartSubtotal: number | null
  items: CartSummary["items"]
  defaults?: CheckoutDefaults
  isSignedIn?: boolean
  hasSavedAddress?: boolean
}

export function CheckoutForm({
  cartId,
  cartTotal,
  cartSubtotal,
  items,
  defaults = {},
  isSignedIn = false,
  hasSavedAddress = false,
}: Props) {
  const [step, setStep] = useState(1)
  const [contactData, setContactData] = useState<ContactData | null>(null)
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleStep1(data: ContactData) {
    setError(null)

    await updateCartContact(cartId, {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      address_1: data.address1,
      address_2: data.address2,
      city: data.city,
      province: data.state,
      postal_code: data.zip,
      country_code: "us",
    })

    // Auto-select the first available shipping option
    try {
      const options = await listShippingOptions(cartId)
      if (options?.[0]) {
        await addShippingMethod(cartId, options[0].id)
      }
    } catch {
      // No shipping options configured yet — continue anyway
    }

    if (isSignedIn && data.saveAddress) {
      try {
        await saveAddressFromCheckout({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          address_1: data.address1,
          address_2: data.address2,
          city: data.city,
          province: data.state,
          postal_code: data.zip,
        })
      } catch {
        // Saving the address is a convenience — never block checkout on it
      }
    }

    try {
      const collection = await initiatePaymentSession(cartId, "stripe")
      const session = collection?.payment_sessions?.[0]
      const sessionData = (session?.data ?? {}) as Record<string, string | null | undefined>
      setStripeClientSecret(sessionData.client_secret ?? null)
    } catch (e) {
      setError((e as Error).message ?? "Could not initiate payment. Try again.")
    }

    setContactData(data)
    setStep(2)
  }

  return (
    <div>
      <StepIndicator current={step} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1
          onNext={handleStep1}
          defaults={defaults}
          isSignedIn={isSignedIn}
          hasSavedAddress={hasSavedAddress}
        />
      )}
      {step === 2 && contactData && (
        <ReviewStep
          contact={contactData}
          cart={{ id: cartId, total: cartTotal, subtotal: cartSubtotal, items }}
          stripeClientSecret={stripeClientSecret}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}
