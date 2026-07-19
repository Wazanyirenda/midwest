"use client"

import { useState, useTransition } from "react"
import { Check } from "lucide-react"
import { updateOrderTracking } from "@/app/actions/admin"

const CARRIERS = ["usps", "ups", "fedex", "dhl"] as const
type Carrier = (typeof CARRIERS)[number]

export function OrderTrackingForm({
  orderId,
  trackingNumber,
  trackingCarrier,
}: {
  orderId: string
  trackingNumber: string | null
  trackingCarrier: string | null
}) {
  const [carrier, setCarrier] = useState<Carrier>(
    (CARRIERS as readonly string[]).includes(trackingCarrier ?? "")
      ? (trackingCarrier as Carrier)
      : "usps"
  )
  const [number, setNumber] = useState(trackingNumber ?? "")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateOrderTracking(orderId, {
          tracking_number: number,
          tracking_carrier: carrier,
        })
        setSaved(true)
      } catch (e) {
        setError((e as Error).message ?? "Could not save")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select
        value={carrier}
        onChange={(e) => setCarrier(e.target.value as Carrier)}
        className="rounded-lg border border-sand-300 px-2 py-1.5 text-sm text-sand-800"
      >
        {CARRIERS.map((c) => (
          <option key={c} value={c}>{c.toUpperCase()}</option>
        ))}
      </select>
      <input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Tracking number"
        className="w-44 rounded-lg border border-sand-300 px-2 py-1.5 text-sm text-sand-800"
      />
      <button
        onClick={onSave}
        disabled={pending || !number.trim()}
        className="rounded-lg bg-sand-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save tracking"}
      </button>
      {saved && <span className="inline-flex items-center gap-1 text-xs text-brand-700"><Check size={12} strokeWidth={2.5} />Saved</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
