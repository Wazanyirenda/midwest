import { supabase } from "@/lib/supabase"
import { formatCartTotal } from "@/lib/cart"
import { StatusBadge } from "@/components/admin/status-badge"
import { OrderStatusSelect } from "@/components/admin/order-status-select"

export const dynamic = "force-dynamic"

type OrderRow = {
  id: string
  display_id: number
  email: string
  status: string
  total_cents: number
  shipping_address: Record<string, string> | null
  created_at: string
  items: Array<{
    id: string
    product_title: string
    variant_title: string | null
    quantity: number
    unit_price_cents: number
  }>
}

export default async function AdminOrdersPage() {
  const { data } = await supabase
    .from("orders")
    .select(
      "id,display_id,email,status,total_cents,shipping_address,created_at," +
        "items:order_items(id,product_title,variant_title,quantity,unit_price_cents)"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  const orders = (data ?? []) as unknown as OrderRow[]

  if (orders.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-sand-500">
        No orders yet — they&apos;ll appear here as soon as customers check out.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const addr = order.shipping_address
        return (
          <div key={order.id} className="rounded-2xl border border-sand-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-sand-900">
                    #{order.display_id}
                  </span>
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-sand-400">
                    {new Date(order.created_at).toLocaleString("en-US")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-sand-600">{order.email}</p>
                {addr && (
                  <p className="mt-0.5 text-xs text-sand-400">
                    {addr.first_name} {addr.last_name} · {addr.address_1}
                    {addr.address_2 ? `, ${addr.address_2}` : ""}, {addr.city},{" "}
                    {addr.province} {addr.postal_code}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-sand-900">
                  {formatCartTotal(order.total_cents)}
                </span>
                <OrderStatusSelect orderId={order.id} current={order.status} />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-sand-50 divide-y divide-sand-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-sand-700">
                    {item.product_title}
                    {item.variant_title ? ` — ${item.variant_title}` : ""}
                    <span className="text-sand-400"> × {item.quantity}</span>
                  </span>
                  <span className="font-medium text-sand-800">
                    {formatCartTotal(item.unit_price_cents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
