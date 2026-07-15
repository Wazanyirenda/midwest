"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { updateCartContact } from "@/app/actions/cart"
import { initiatePaymentSession, addShippingMethod, listShippingOptions, completeCart } from "@/app/actions/checkout"

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
    message: "You must confirm you are 21+ and purchasing for research",
  }),
})

type ContactData = z.infer<typeof contactSchema>
type PaymentMethod = "stripe" | "nowpayments"

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
]

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Contact & Shipping", "Payment", "Review & Place Order"]
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
                {done ? "✓" : num}
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

// ─── Step 1: Contact + Shipping ───────────────────────────────────────────────

function Step1({ onNext }: { onNext: (data: ContactData) => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<ContactData>({ resolver: zodResolver(contactSchema as any) })

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

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register("ageConfirmed")}
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-amber-800">
            I confirm I am <strong>21 years of age or older</strong> and am purchasing these
            products solely for legitimate laboratory research purposes. I understand these
            products are <strong>not for human consumption</strong>.
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
        {isSubmitting ? "Saving…" : "Continue to Payment →"}
      </button>
    </form>
  )
}

// ─── Step 2: Payment method ───────────────────────────────────────────────────

function Step2({
  onNext,
  onBack,
}: {
  onNext: (method: PaymentMethod) => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<PaymentMethod>("stripe")

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>

      <div className="space-y-3">
        <label className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all
          ${selected === "stripe" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
          <input type="radio" name="payment" value="stripe"
            checked={selected === "stripe"} onChange={() => setSelected("stripe")}
            className="mt-1 h-4 w-4 text-brand-600" />
          <div>
            <div className="font-semibold text-gray-900">💳 Credit / Debit Card</div>
            <div className="text-sm text-gray-500 mt-0.5">Visa, Mastercard, Amex — processed securely via Stripe</div>
          </div>
        </label>

        <label className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all
          ${selected === "nowpayments" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"}`}>
          <input type="radio" name="payment" value="nowpayments"
            checked={selected === "nowpayments"} onChange={() => setSelected("nowpayments")}
            className="mt-1 h-4 w-4 text-brand-600" />
          <div>
            <div className="font-semibold text-gray-900">₿ Cryptocurrency</div>
            <div className="text-sm text-gray-500 mt-0.5">USDC, USDT, BTC, ETH and 350+ coins via NOWPayments</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {["USDC", "USDT", "BTC", "ETH", "SOL"].map((coin) => (
                <span key={coin} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{coin}</span>
              ))}
            </div>
          </div>
        </label>
      </div>

      {selected === "nowpayments" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          <strong>Note:</strong> Crypto payments require blockchain confirmations (usually 1–30 minutes).
          Your order is held until payment is confirmed. Stablecoins (USDC/USDT) are fastest.
          Crypto payments are non-refundable.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={() => onNext(selected)}
          className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          Review Order →
        </button>
      </div>
    </div>
  )
}

// ─── Stripe payment form (used inside Step 3) ─────────────────────────────────

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

// ─── Step 3: Review + place order ────────────────────────────────────────────

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

function Step3({
  contact,
  paymentMethod,
  cart,
  stripeClientSecret,
  onBack,
  onSubmitCrypto,
  submitting,
}: {
  contact: ContactData
  paymentMethod: PaymentMethod
  cart: CartSummary
  stripeClientSecret: string | null
  onBack: () => void
  onSubmitCrypto: () => void
  submitting: boolean
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
        By placing this order you confirm these products are for <strong>research use only</strong> and you are 21+.
      </div>

      {paymentMethod === "stripe" && stripeClientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
          <StripePaymentForm cartId={cart.id} onSuccess={handleOrderSuccess} onBack={onBack} />
        </Elements>
      ) : paymentMethod === "nowpayments" ? (
        <div className="flex gap-3">
          <button onClick={onBack} disabled={submitting}
            className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            ← Back
          </button>
          <button onClick={onSubmitCrypto} disabled={submitting}
            className="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {submitting ? "Opening payment…" : "Pay with Crypto →"}
          </button>
        </div>
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
  userEmail?: string
}

export function CheckoutForm({ cartId, cartTotal, cartSubtotal, items, userEmail }: Props) {
  const [step, setStep] = useState(1)
  const [contactData, setContactData] = useState<ContactData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe")
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [cryptoInvoiceUrl, setCryptoInvoiceUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStep1(data: ContactData) {
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

    setContactData(data)
    setStep(2)
  }

  async function handleStep2(method: PaymentMethod) {
    setPaymentMethod(method)
    setSubmitting(true)
    setError(null)

    try {
      const collection = await initiatePaymentSession(cartId, method)
      const session = collection?.payment_sessions?.[0]

      const sessionData = (session?.data ?? {}) as Record<string, string | null | undefined>
      if (method === "stripe") {
        setStripeClientSecret(sessionData.client_secret ?? null)
      } else {
        setCryptoInvoiceUrl(sessionData.invoiceUrl ?? null)
      }
    } catch (e) {
      setError((e as Error).message ?? "Could not initiate payment. Try again.")
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setStep(3)
  }

  async function handleCryptoSubmit() {
    if (!cryptoInvoiceUrl) {
      setError("No payment URL available. Please go back and try again.")
      return
    }
    setSubmitting(true)
    // Open the NOWPayments invoice in the same tab — they redirect back on success/cancel
    window.location.href = cryptoInvoiceUrl
  }

  // Pre-fill email from Clerk if provided
  const defaultEmail = userEmail

  return (
    <div>
      <StepIndicator current={step} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1 onNext={handleStep1} />
      )}
      {step === 2 && (
        <Step2
          onNext={handleStep2}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && contactData && (
        <Step3
          contact={contactData}
          paymentMethod={paymentMethod}
          cart={{ id: cartId, total: cartTotal, subtotal: cartSubtotal, items }}
          stripeClientSecret={stripeClientSecret}
          onBack={() => setStep(2)}
          onSubmitCrypto={handleCryptoSubmit}
          submitting={submitting}
        />
      )}

      {/* Suppress unused variable warning for defaultEmail — used for future pre-fill */}
      <input type="hidden" value={defaultEmail ?? ""} aria-hidden />
    </div>
  )
}
