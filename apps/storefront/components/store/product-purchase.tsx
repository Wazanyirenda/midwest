"use client"

import { useState } from "react"
import { formatPrice } from "@/lib/utils"
import { AddToCartButton } from "@/components/store/add-to-cart-button"

type Variant = {
  id: string
  title: string
  price_cents: number
}

type Props = {
  variants: Variant[]
  children?: React.ReactNode
}

export function ProductPurchase({ variants, children }: Props) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "")
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0]

  if (!selected) {
    return (
      <button
        disabled
        className="w-full rounded-full bg-sand-200 px-6 py-3.5 text-base font-semibold text-sand-400 cursor-not-allowed"
      >
        Out of Stock
      </button>
    )
  }

  return (
    <>
      <p className="text-2xl font-semibold text-brand-600">
        {formatPrice(selected.price_cents)}
      </p>

      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-sand-700 mb-3">
            Select size / concentration
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  v.id === selected.id
                    ? "border-brand-500 text-brand-700 bg-brand-50"
                    : "border-sand-300 hover:border-brand-500 hover:text-brand-700"
                }`}
              >
                {v.title}
                <span className="ml-1 text-sand-400">
                  — {formatPrice(v.price_cents)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {children}

      <AddToCartButton variantId={selected.id} />
    </>
  )
}
