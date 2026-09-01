"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Clock, AlertCircle } from "lucide-react"
import { getOrderPaymentStatus } from "@/app/actions/checkout"

// The webhook usually lands within a second or two, but a provider retry or a
// slow delivery can take longer. Poll a bounded number of times, then tell the
// customer their money is safe and stop.
const POLL_MS = 2000
const MAX_POLLS = 20

type Phase = "waiting" | "paid" | "canceled" | "timeout" | "unknown"

export function PaymentStatus({
  orderId,
  initialStatus,
}: {
  orderId: string
  initialStatus: string
}) {
  const settled = (s: string) =>
    ["paid", "shipped", "delivered"].includes(s)
      ? "paid"
      : ["canceled", "refunded"].includes(s)
        ? "canceled"
        : null

  const [phase, setPhase] = useState<Phase>(
    () => settled(initialStatus) ?? (initialStatus === "unknown" ? "unknown" : "waiting")
  )

  useEffect(() => {
    if (phase !== "waiting") return

    let polls = 0
    let cancelled = false

    const timer = setInterval(async () => {
      polls += 1
      const result = await getOrderPaymentStatus(orderId)
      if (cancelled) return

      const next = settled(result.status)
      if (next) {
        setPhase(next)
        clearInterval(timer)
      } else if (polls >= MAX_POLLS) {
        setPhase("timeout")
        clearInterval(timer)
      }
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [orderId, phase])

  if (phase === "paid") {
    return (
      <Shell
        icon={<Check className="h-10 w-10 text-brand-600" strokeWidth={2.5} />}
        tone="bg-brand-100"
        title="Order confirmed"
        body="Payment received. You'll get a confirmation email shortly."
        orderId={orderId}
      />
    )
  }

  if (phase === "canceled") {
    return (
      <Shell
        icon={<AlertCircle className="h-10 w-10 text-red-600" strokeWidth={2} />}
        tone="bg-red-100"
        title="Payment not completed"
        body="This order was canceled or refunded. You have not been charged. Contact us if that looks wrong."
        orderId={orderId}
      />
    )
  }

  if (phase === "timeout" || phase === "unknown") {
    return (
      <Shell
        icon={<Clock className="h-10 w-10 text-amber-600" strokeWidth={2} />}
        tone="bg-amber-100"
        title="Still confirming your payment"
        body="Your payment is being processed and nothing is lost. We'll email you as soon as it clears — no need to pay again. Contact us if you don't hear within an hour."
        orderId={orderId}
      />
    )
  }

  return (
    <Shell
      icon={
        <span className="block h-8 w-8 animate-spin rounded-full border-[3px] border-sand-300 border-t-brand-600" />
      }
      tone="bg-sand-100"
      title="Confirming your payment…"
      body="This takes a moment. Please don't close this page or pay again."
      orderId={orderId}
    />
  )
}

function Shell({
  icon,
  tone,
  title,
  body,
  orderId,
}: {
  icon: React.ReactNode
  tone: string
  title: string
  body: string
  orderId: string
}) {
  return (
    <>
      <div
        className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${tone}`}
      >
        {icon}
      </div>
      <h1 className="text-3xl font-bold text-sand-900">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sand-600">{body}</p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={`/account/orders/${orderId}`}
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          View order details
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-sand-300 px-6 py-3 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50"
        >
          Continue shopping
        </Link>
      </div>
    </>
  )
}
