export type ShippingOption = {
  id: string
  name: string
  amount: number // cents
}

const FREE_SHIPPING_THRESHOLD_CENTS = 20000 // $200

export function getShippingOptions(subtotalCents: number): ShippingOption[] {
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return [{ id: "standard", name: "Standard Shipping (free over $200)", amount: 0 }]
  }
  return [{ id: "standard", name: "Standard Shipping", amount: 995 }]
}
