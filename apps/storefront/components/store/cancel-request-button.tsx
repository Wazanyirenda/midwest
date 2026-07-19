"use client"

import { useState, useTransition } from "react"
import { requestCancellation } from "@/app/actions/orders"

export function CancelRequestButton({ orderId }: { orderId: string }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!confirm("Request cancellation of this order? We'll review it before it ships.")) {
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await requestCancellation(orderId)
        setDone(true)
      } catch (e) {
        setError((e as Error).message ?? "Could not request cancellation.")
      }
    })
  }

  if (done) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        Cancellation requested — we&apos;ll be in touch shortly.
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Request cancellation"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
