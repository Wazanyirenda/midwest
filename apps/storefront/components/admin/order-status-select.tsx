"use client"

import { useTransition } from "react"
import { updateOrderStatus } from "@/app/actions/admin"

const STATUSES = ["pending", "paid", "shipped", "delivered", "canceled"] as const
type Status = (typeof STATUSES)[number]

export function OrderStatusSelect({
  orderId,
  current,
}: {
  orderId: string
  current: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => updateOrderStatus(orderId, e.target.value as Status))
      }
      className="rounded-lg border border-sand-300 px-3 py-1.5 text-sm text-sand-700 focus:border-brand-500 focus:outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}
