"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { reorder } from "@/app/actions/orders"

export function ReorderButton({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setError(null)
    startTransition(async () => {
      try {
        setResult(await reorder(orderId))
      } catch (e) {
        setError((e as Error).message ?? "Could not reorder.")
      }
    })
  }

  if (result) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
        {result.added > 0 ? (
          <>
            Added {result.added} item{result.added === 1 ? "" : "s"} to your cart.{" "}
            <Link href="/cart" className="font-semibold underline">
              View cart
            </Link>
          </>
        ) : (
          <>Nothing could be re-added.</>
        )}
        {result.skipped.length > 0 && (
          <span className="block text-xs text-brand-700">
            Unavailable: {result.skipped.join(", ")}
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Buy again"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
