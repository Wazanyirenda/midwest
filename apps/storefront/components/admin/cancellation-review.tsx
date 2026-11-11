"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, X } from "lucide-react"
import { approveCancellation, declineCancellation } from "@/app/actions/admin-cancellations"

/**
 * A customer's request to cancel. Shown in place of the payment and status
 * controls until someone decides, so an order can't be approved as paid or
 * shipped while the customer is asking for it not to be.
 */
export function CancellationReview({
  orderId,
  requestedAt,
  paid,
  canDecide,
}: {
  orderId: string
  requestedAt: string
  paid: boolean
  /** Admins only, like other status changes. */
  canDecide: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"idle" | "approve" | "decline">("idle")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      setMode("idle")
      router.refresh()
    })
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-amber-900">
        <AlertTriangle size={16} strokeWidth={2} />
        The customer asked to cancel this order
      </p>
      <p className="mt-1 text-amber-800">
        Requested {new Date(requestedAt).toLocaleString("en-US")}.{" "}
        {paid
          ? "It's paid: approving stops it shipping and puts its stock back, and you'll need to refund the customer."
          : "It hasn't been paid, so approving simply cancels it."}
      </p>

      {!canDecide ? (
        <p className="mt-3 text-xs text-amber-800">An admin approves or declines cancellations.</p>
      ) : mode === "idle" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <Check size={15} strokeWidth={2.5} />
            Approve cancellation
          </button>
          <button
            type="button"
            onClick={() => setMode("decline")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-sand-800 transition-colors hover:bg-sand-50"
          >
            <X size={15} strokeWidth={2.5} />
            Decline, keep the order
          </button>
        </div>
      ) : mode === "approve" ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
          <p className="font-medium text-sand-900">Cancel this order?</p>
          <p className="mt-1 text-xs text-sand-600">
            The customer is emailed that it&apos;s canceled
            {paid ? " and that you'll be in touch about their refund" : ""}. This can&apos;t be undone from here.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveCancellation(orderId))}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Canceling…" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("idle")}
              className="rounded-lg border border-sand-300 px-4 py-2 text-sm text-sand-700 hover:bg-sand-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-sand-200 bg-white p-3">
          <label htmlFor={`decline-${orderId}`} className="font-medium text-sand-900">
            Why can&apos;t it be canceled? (sent to the customer)
          </label>
          <input
            id={`decline-${orderId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="e.g. Your order had already shipped"
            className="mt-2 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => declineCancellation(orderId, reason))}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Decline request"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("idle")}
              className="rounded-lg border border-sand-300 px-4 py-2 text-sm text-sand-700 hover:bg-sand-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
