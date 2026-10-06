import { AlertTriangle, XOctagon } from "lucide-react"

/**
 * Remaining-stock line for cart and checkout lines.
 *
 * Sold out always shows — it blocks the order, so the owner's threshold has no
 * say over it. A low count only appears at or below that threshold, so a
 * well-stocked line stays quiet instead of manufacturing urgency.
 */
export function StockNote({
  available,
  threshold,
  className = "",
}: {
  available: number
  threshold: number
  className?: string
}) {
  // Icon as well as colour, never colour alone.
  if (available <= 0) {
    return (
      <p className={`flex items-center gap-1.5 text-xs font-medium text-red-600 ${className}`}>
        <XOctagon size={13} strokeWidth={2} className="shrink-0" />
        Out of stock
      </p>
    )
  }

  if (threshold <= 0 || available > threshold) return null

  return (
    <p className={`flex items-center gap-1.5 text-xs font-medium text-amber-700 ${className}`}>
      <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
      Only {available} left in stock
    </p>
  )
}
