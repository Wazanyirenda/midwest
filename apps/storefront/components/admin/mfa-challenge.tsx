"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { submitMfaChallenge } from "@/app/actions/mfa"

export function MfaChallenge({ next }: { next: string }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const result = await submitMfaChallenge(code)
      if (result.error) {
        setError(result.error)
        setCode("")
        return
      }
      router.replace(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-3 text-center font-mono text-xl tracking-[0.3em] text-sand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
      >
        {pending ? "Checking…" : "Verify"}
      </button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </form>
  )
}
