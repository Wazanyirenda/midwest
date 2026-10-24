"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { changeLineItemQuantity, removeLineItem } from "@/app/actions/cart"

// Long enough to fold a burst of taps into one request, short enough that the
// summary total catches up before anyone reaches for the checkout button.
const SEND_DELAY_MS = 300

const BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-md border border-sand-300 text-sand-600 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sand-300 disabled:hover:text-sand-600"

/**
 * The count moves the instant it is tapped; the server hears about it once the
 * taps stop. Waiting on a round trip and a full re-render per tap is what made
 * the old form-per-button stepper feel stuck.
 *
 * Changes are sent as a delta, never an absolute count — see
 * changeLineItemQuantity for why. The server re-reads stock and is the real
 * limit; `available` here only stops the customer asking for what isn't there.
 */
export function QuantityStepper({
  cartId,
  lineItemId,
  quantity,
  available,
  productTitle,
}: {
  cartId: string
  lineItemId: string
  quantity: number
  /** Undefined means unknown stock — not zero — so the stepper isn't capped. */
  available: number | undefined
  productTitle: string
}) {
  // Taps not yet reflected in `quantity`: either waiting for the timer, or sent
  // and waiting for the re-rendered page to bring the new count back.
  const [pendingDelta, setPendingDelta] = useState(0)
  const [removing, setRemoving] = useState(false)
  const [, startTransition] = useTransition()
  const unsent = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shown = quantity + pendingDelta
  const atStockLimit = available !== undefined && shown >= available

  function send() {
    timer.current = null
    const delta = unsent.current
    unsent.current = 0
    if (delta === 0) return

    startTransition(async () => {
      try {
        await changeLineItemQuantity(cartId, lineItemId, delta)
      } catch (e) {
        console.error("[cart] quantity change failed:", e)
      }
      // Settled either way: on success the new `quantity` prop now includes
      // the delta; on failure the count falls back to what the server has.
      startTransition(() => setPendingDelta((p) => p - delta))
    })
  }

  function bump(delta: 1 | -1) {
    unsent.current += delta
    setPendingDelta((p) => p + delta)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(send, SEND_DELAY_MS)
  }

  function remove() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    unsent.current = 0
    setRemoving(true)
    startTransition(async () => {
      try {
        await removeLineItem(cartId, lineItemId)
      } catch (e) {
        console.error("[cart] remove failed:", e)
        startTransition(() => setRemoving(false))
      }
    })
  }

  // Leaving the page mid-burst (straight to checkout, say) must not drop the
  // last taps on the floor.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        send()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only; send reads refs
  }, [])

  return (
    <div className={`flex items-center gap-2 ${removing ? "opacity-50" : ""}`}>
      {shown <= 1 ? (
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          aria-label={`Remove ${productTitle} from cart`}
          className={BUTTON}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={removing}
          aria-label="Decrease quantity"
          className={BUTTON}
        >
          <Minus size={14} strokeWidth={2} />
        </button>
      )}
      <span
        aria-live="polite"
        className="w-6 text-center text-sm font-medium tabular-nums text-sand-900"
      >
        {shown}
      </span>
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={atStockLimit || removing}
        aria-label={atStockLimit ? "No more stock available" : "Increase quantity"}
        className={BUTTON}
      >
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  )
}
