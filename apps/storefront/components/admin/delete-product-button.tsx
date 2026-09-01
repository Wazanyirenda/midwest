"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteProduct } from "@/app/actions/admin-products"

export function DeleteProductButton({
  productId,
  title,
}: {
  productId: string
  title: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteProduct(productId)
      // On success the action redirects, so reaching here means it failed.
      if (result?.error) setError(result.error)
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs text-sand-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 size={13} strokeWidth={1.75} />
        Delete
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs text-red-800">
        Delete <strong>{title}</strong> and its images? Past orders keep their
        records. This can&apos;t be undone.
      </p>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md px-2 py-1.5 text-xs text-sand-600 hover:text-sand-900"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
