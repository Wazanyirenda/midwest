"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { approveManualPayment, rejectManualOrder } from "@/app/actions/manual-payments"

/**
 * Approve or reject a hand-checked crypto payment. Both take a second click to
 * confirm: approving sends the customer their receipt and prints it, and
 * rejecting emails them a cancellation. Neither can be taken back from here.
 */
export function ManualPaymentReview({
  orderId,
  hasTxid,
  canApprove,
}: {
  orderId: string
  hasTxid: boolean
  /** Admins only. Staff see the details but can't take the money. */
  canApprove: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!canApprove) {
    return <p className="text-xs text-sand-600">An admin approves or rejects this payment.</p>
  }

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
    <div className="space-y-2">
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("approve")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Check size={15} strokeWidth={2.5} />
            Approve payment
          </button>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            <X size={15} strokeWidth={2.5} />
            Reject
          </button>
        </div>
      )}

      {mode === "approve" && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
          <p className="font-medium text-sand-900">
            {hasTxid
              ? "Checked it on the blockchain? Right address, right amount, confirmed?"
              : "No transaction ID was submitted. Only approve if you've confirmed the payment another way."}
          </p>
          <p className="mt-1 text-xs text-sand-600">
            This marks the order paid, takes the stock, prints the receipt and emails it to the customer and to you.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveManualPayment(orderId))}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Approving…" : "Yes, approve"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("idle")}
              className="rounded-lg border border-sand-300 px-4 py-2 text-sm text-sand-700 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <label htmlFor={`reject-${orderId}`} className="font-medium text-sand-900">
            Why? (sent to the customer)
          </label>
          <input
            id={`reject-${orderId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="e.g. No payment found for this transaction ID"
            className="mt-2 w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => rejectManualOrder(orderId, reason))}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Canceling…" : "Cancel the order"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("idle")}
              className="rounded-lg border border-sand-300 px-4 py-2 text-sm text-sand-700 hover:bg-white disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
