"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore } from "lucide-react"
import { archiveAllCanceled, archiveOrder, unarchiveOrder } from "@/app/actions/admin-archive"

export function ArchiveButton({ orderId, archived }: { orderId: string; archived: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    setError(null)
    startTransition(async () => {
      const result = archived ? await unarchiveOrder(orderId) : await archiveOrder(orderId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-sm text-sand-700 transition-colors hover:bg-sand-50 disabled:opacity-50"
      >
        {archived ? <ArchiveRestore size={14} strokeWidth={2} /> : <Archive size={14} strokeWidth={2} />}
        {pending ? "…" : archived ? "Restore" : "Archive"}
      </button>
    </span>
  )
}

export function ArchiveAllCanceledButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run() {
    setError(null)
    startTransition(async () => {
      const result = await archiveAllCanceled()
      if (result.error) setError(result.error)
      else {
        setConfirming(false)
        router.refresh()
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {confirming ? (
        <>
          <span className="text-xs text-sand-600">Archive every canceled order?</span>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Archiving…" : "Yes"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-sand-300 px-3 py-1.5 text-xs text-sand-700 hover:bg-sand-50"
          >
            No
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs text-sand-700 hover:bg-sand-50"
        >
          <Archive size={13} strokeWidth={2} />
          Archive all canceled
        </button>
      )}
    </span>
  )
}
