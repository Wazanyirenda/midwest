const FREE_SHIPPING_THRESHOLD_CENTS = 20000 // $200
const STANDARD_SHIPPING_CENTS = 995

/**
 * Shipping for a cart, worked out from its current subtotal every time rather
 * than stored, so it can't go stale when items are added or removed after the
 * address step. An empty cart ships nothing.
 */
export function shippingCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS
}
