"use client"

import { useState } from "react"
import { addToCart } from "@/app/actions/cart"

type Props = {
  variantId: string
  disabled?: boolean
}

export function AddToCartButton({ variantId, disabled }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle")

  async function handleClick() {
    if (status === "loading") return
    setStatus("loading")
    try {
      await addToCart(variantId)
      setStatus("added")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("idle")
      alert("Could not add to cart. Please try again.")
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      className="w-full rounded-full bg-brand-600 px-6 py-3.5 text-base font-semibold text-white
        hover:bg-brand-700 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed transition-all
        active:scale-[0.97]"
    >
      {status === "loading"
        ? "Adding…"
        : status === "added"
          ? "Added to Cart"
          : "Add to Cart"}
    </button>
  )
}
