"use client"

import { useRef, useState, useTransition } from "react"
import { Minus, Plus } from "lucide-react"
import { adjustInventory } from "@/app/actions/admin-products"

export function StockAdjuster({
  variantId,
  quantity,
}: {
  variantId: string
  quantity: number
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await adjustInventory(variantId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      setOpen(false)
    })
  }

  // One-tap restock for the common case; the form handles everything else.
  function quick(delta: number) {
    setError(null)
    const formData = new FormData()
    formData.set("delta", String(delta))
    formData.set("reason", delta > 0 ? "restock" : "shrinkage")
    startTransition(async () => {
      const result = await adjustInventory(variantId, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => quick(-1)}
          disabled={pending || quantity === 0}
          aria-label="Remove one from stock"
          className="rounded-md border border-sand-300 p-1 text-sand-600 transition-colors hover:border-sand-400 hover:text-sand-900 disabled:opacity-30"
        >
          <Minus size={13} strokeWidth={2} />
        </button>
        <button
          onClick={() => quick(1)}
          disabled={pending}
          aria-label="Add one to stock"
          className="rounded-md border border-sand-300 p-1 text-sand-600 transition-colors hover:border-sand-400 hover:text-sand-900 disabled:opacity-30"
        >
          <Plus size={13} strokeWidth={2} />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-1 text-xs text-brand-600 hover:underline"
        >
          {open ? "Close" : "Adjust…"}
        </button>
      </div>

      {open && (
        <form ref={formRef} action={submit} className="flex flex-wrap items-center gap-1.5">
          <input
            name="delta"
            type="number"
            step="1"
            required
            placeholder="+/−"
            aria-label="Amount to add or remove"
            className="w-20 rounded-md border border-sand-300 px-2 py-1 text-xs tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            name="reason"
            defaultValue="restock"
            aria-label="Reason"
            className="rounded-md border border-sand-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="restock">Restock</option>
            <option value="correction">Correction</option>
            <option value="shrinkage">Shrinkage</option>
            <option value="sale">Sale</option>
            <option value="manual">Other</option>
          </select>
          <input
            name="note"
            placeholder="Note (optional)"
            aria-label="Note"
            className="w-36 rounded-md border border-sand-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "…" : "Apply"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
