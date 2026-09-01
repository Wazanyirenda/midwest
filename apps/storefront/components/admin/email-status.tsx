"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, AlertCircle, Send } from "lucide-react"
import { sendTestEmail } from "@/app/actions/admin-email-test"

export function EmailStatus({
  detail,
  ready,
}: {
  detail: string
  ready: boolean
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function test() {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await sendTestEmail()
      if (result?.error) setError(result.error)
      else setMessage(result.message ?? "Sent.")
    })
  }

  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          {ready ? (
            <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-brand-600" />
          ) : (
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-medium text-sand-900">Delivery</p>
            <p className="mt-0.5 text-xs text-sand-500">{detail}</p>
          </div>
        </div>

        <button
          onClick={test}
          disabled={pending || !ready}
          className="flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 transition-colors hover:border-brand-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={13} strokeWidth={2} />
          {pending ? "Sending…" : "Send test email"}
        </button>
      </div>

      {!ready && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          No transport configured — order confirmations are not being delivered.
          Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local.
        </p>
      )}
      {message && (
        <p className="mt-2 rounded-md bg-brand-50 px-2 py-1.5 text-xs text-brand-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
