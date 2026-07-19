"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { toggleWishlist } from "@/app/actions/wishlist"

export function WishlistButton({
  productId,
  initial,
  className = "",
}: {
  productId: string
  initial: boolean
  className?: string
}) {
  const [active, setActive] = useState(initial)
  const [, startTransition] = useTransition()

  function onClick(e: React.MouseEvent) {
    // Cards wrap the button in a product link — don't navigate.
    e.preventDefault()
    e.stopPropagation()

    const next = !active
    setActive(next) // optimistic
    startTransition(async () => {
      try {
        const result = await toggleWishlist(productId)
        setActive(result.added)
      } catch {
        setActive(!next) // revert
      }
    })
  }

  return (
    <button
      onClick={onClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white/90 shadow-sm transition-colors ${
        active
          ? "border-red-200 text-red-500"
          : "border-sand-200 text-sand-400 hover:text-red-400"
      } ${className}`}
    >
      <Heart size={16} strokeWidth={2} fill={active ? "currentColor" : "none"} />
    </button>
  )
}
