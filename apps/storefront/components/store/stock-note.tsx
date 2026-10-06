import { AlertTriangle, Check, XOctagon } from "lucide-react"

/**
 * Remaining-stock line for cart and checkout lines.
 *
 * Sold out always shows — it blocks the order, so neither setting has a say
 * over it. Otherwise the count is stated outright when the owner has counts
 * switched on, styled as urgent only at or below their low-stock threshold, so
 * "2 left" reads differently from "40 left" without inventing scarcity.
 */
export function StockNote({
  available,
  show,
  threshold,
  className = "",
}: {
  available: number
  show: boolean
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

  if (!show) return null

  const low = threshold > 0 && available <= threshold

  return (
    <p
      className={`flex items-center gap-1.5 text-xs ${
        low ? "font-medium text-amber-700" : "text-sand-600"
      } ${className}`}
    >
      {low ? (
        <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
      ) : (
        <Check size={13} strokeWidth={2} className="shrink-0 text-brand-600" />
      )}
      {low ? `Only ${available} left in stock` : `${available} left in stock`}
    </p>
  )
}
