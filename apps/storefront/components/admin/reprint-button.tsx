"use client"

import { useState, useTransition } from "react"
import { Printer } from "lucide-react"
import { reprintOrderLabel } from "@/app/actions/admin-print"

export function ReprintButton({ orderId }: { orderId: string }) {
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setError(null)
    startTransition(async () => {
      const result = await reprintOrderLabel(orderId)
      if (result?.error) {
        setError(result.error)
        return
      }
      setQueued(true)
      setTimeout(() => setQueued(false), 3000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 transition-colors hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Printer size={13} strokeWidth={2} />
        {pending ? "Sending…" : queued ? "Sent to printer" : "Print label"}
      </button>
      {error && (
        <span role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </div>
  )
}
