"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"

export function ShareWishlistButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false)

  async function onClick() {
    const url = `${window.location.origin}/wishlist/${shareToken}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      prompt("Copy your wishlist link:", url)
    }
  }

  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      {copied ? <span className="inline-flex items-center gap-1.5"><Check size={14} strokeWidth={2.5} />Link copied</span> : <span className="inline-flex items-center gap-1.5"><Share2 size={14} strokeWidth={1.75} />Share wishlist</span>}
    </button>
  )
}
