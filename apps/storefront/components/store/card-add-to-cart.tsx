"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { addToCart } from "@/app/actions/cart"

const BUTTON_CLS =
  "flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 " +
  "text-sm font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.98] " +
  "disabled:cursor-not-allowed disabled:opacity-40"

type Props = {
  /** The only variant, when the product has exactly one. */
  variantId: string | null
  handle: string
  inStock: boolean
}

/**
 * A product with one size can go straight into the cart. A product with
 * several can't — picking silently would put the wrong vial in the cart — so
 * it sends the buyer to the product page to choose.
 */
export function CardAddToCart({ variantId, handle, inStock }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "added">("idle")

  if (!inStock) {
    return (
      <span className="flex w-full items-center justify-center rounded-full border border-sand-200 bg-sand-50 px-4 py-2.5 text-sm font-medium text-sand-600">
        Out of stock
      </span>
    )
  }

  if (!variantId) {
    return (
      <Link href={`/products/${handle}`} className={BUTTON_CLS}>
        Select Size
        <ArrowRight size={15} strokeWidth={2.5} />
      </Link>
    )
  }

  async function add() {
    if (status === "loading" || !variantId) return
    setStatus("loading")
    try {
      await addToCart(variantId)
      setStatus("added")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("idle")
    }
  }

  return (
    <button onClick={add} disabled={status === "loading"} className={BUTTON_CLS}>
      {status === "loading" ? "Adding…" : status === "added" ? "Added" : "Add To Cart"}
      {status === "idle" && <ArrowRight size={15} strokeWidth={2.5} />}
    </button>
  )
}
