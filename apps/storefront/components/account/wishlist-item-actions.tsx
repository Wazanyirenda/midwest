"use client"

import { useState, useTransition } from "react"
import { moveWishlistItemToCart, removeWishlistItem } from "@/app/actions/wishlist"

export function WishlistItemActions({ itemId }: { itemId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch (e) {
        setError((e as Error).message ?? "Something went wrong")
      }
    })
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => moveWishlistItemToCart(itemId))}
          className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          Move to cart
        </button>
        <button
          disabled={pending}
          onClick={() => run(() => removeWishlistItem(itemId))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
