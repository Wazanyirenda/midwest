"use client"

import { useState, useTransition } from "react"
import { updateVariant } from "@/app/actions/admin"

type Variant = {
  id: string
  title: string
  sku: string
  price_cents: number
  inventory_quantity: number
}

export function VariantEditor({ variant }: { variant: Variant }) {
  const [price, setPrice] = useState((variant.price_cents / 100).toFixed(2))
  const [stock, setStock] = useState(String(variant.inventory_quantity))
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const dirty =
    Number(price) !== variant.price_cents / 100 ||
    Number(stock) !== variant.inventory_quantity

  function save() {
    startTransition(async () => {
      await updateVariant(variant.id, {
        price_cents: Math.round(Number(price) * 100),
        inventory_quantity: Number(stock),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const inputCls =
    "w-24 rounded-lg border border-sand-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

  return (
    <tr>
      <td className="py-2.5 pr-4 text-sand-700">{variant.title}</td>
      <td className="py-2.5 pr-4 font-mono text-xs text-sand-500">{variant.sku}</td>
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-1">
          <span className="text-sand-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
          />
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <input
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={`${inputCls} ${Number(stock) <= 10 ? "border-amber-400 bg-amber-50" : ""}`}
        />
      </td>
      <td className="py-2.5 text-right">
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Saving…" : saved ? "✓ Saved" : "Save"}
        </button>
      </td>
    </tr>
  )
}
