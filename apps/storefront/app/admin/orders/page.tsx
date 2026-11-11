import Link from "next/link"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { AlertTriangle, ExternalLink, Search } from "lucide-react"
import { formatCartTotal } from "@/lib/cart"
import { isAdmin } from "@/lib/admin"
import { explorerUrl, formatCryptoAmount, networkLabel } from "@/lib/crypto-assets"
import { StatusBadge } from "@/components/admin/status-badge"
import { OrderStatusSelect } from "@/components/admin/order-status-select"
import { OrderTrackingForm } from "@/components/admin/order-tracking-form"
import { ReprintButton } from "@/components/admin/reprint-button"
import { ManualPaymentReview } from "@/components/admin/manual-payment-review"

export const dynamic = "force-dynamic"

type OrderRow = {
  id: string
  order_code: string
  email: string
  status: string
  total_cents: number
  shipping_address: Record<string, string> | null
  tracking_number: string | null
  tracking_carrier: string | null
  cancellation_requested_at: string | null
  cancel_reason: string | null
  created_at: string
  payment_provider: string | null
  payment_asset: string | null
  payment_network: string | null
  payment_address: string | null
  payment_amount_crypto: number | string | null
  payment_txid: string | null
  payment_submitted_at: string | null
  approved_at: string | null
  items: Array<{
    id: string
    product_title: string
    variant_title: string | null
    quantity: number
    unit_price_cents: number
  }>
}

const VIEWS = {
  all: "All",
  review: "Awaiting approval",
  unpaid: "Awaiting payment",
  paid: "Paid, to ship",
  shipped: "Shipped",
  canceled: "Canceled",
} as const
type View = keyof typeof VIEWS

const MAX_QUERY = 100

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>
}) {
  const params = await searchParams
  const view: View = params.view && params.view in VIEWS ? (params.view as View) : "all"
  const q = (params.q ?? "").trim().slice(0, MAX_QUERY)

  let query = supabase
    .from("orders")
    .select(
      "id,order_code,email,status,total_cents,shipping_address," +
        "tracking_number,tracking_carrier,cancellation_requested_at,cancel_reason,created_at," +
        "payment_provider,payment_asset,payment_network,payment_address,payment_amount_crypto," +
        "payment_txid,payment_submitted_at,approved_at," +
        "items:order_items(id,product_title,variant_title,quantity,unit_price_cents)"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (view === "review") {
    query = query.eq("status", "pending").eq("payment_provider", "manual").not("payment_submitted_at", "is", null)
  } else if (view === "unpaid") {
    query = query.eq("status", "pending").is("payment_submitted_at", null)
  } else if (view === "paid") {
    query = query.eq("status", "paid")
  } else if (view !== "all") {
    query = query.eq("status", view)
  }

  // An order code is matched exactly; anything else is treated as an email.
  if (/^MW-[A-Z0-9]{6}$/i.test(q)) query = query.eq("order_code", q.toUpperCase())
  else if (q) query = query.ilike("email", `%${q}%`)

  const [{ data }, canApprove, { count: reviewCount }] = await Promise.all([
    query,
    isAdmin(),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_provider", "manual")
      .not("payment_submitted_at", "is", null),
  ])

  const orders = (data ?? []) as unknown as OrderRow[]

  const href = (next: View) => {
    const sp = new URLSearchParams()
    if (next !== "all") sp.set("view", next)
    if (q) sp.set("q", q)
    const s = sp.toString()
    return s ? `/admin/orders?${s}` : "/admin/orders"
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-sand-900">Orders</h1>
          <p className="mt-0.5 text-sm text-sand-600">
            {orders.length === 0 ? "Nothing here" : `${orders.length} most recent`}
          </p>
        </div>
        <form action="/admin/orders" className="flex items-center gap-2">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sand-500" />
            <input
              name="q"
              defaultValue={q}
              maxLength={MAX_QUERY}
              placeholder="MW-7K3Q9P or email"
              className="w-56 rounded-lg border border-sand-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button className="rounded-lg border border-sand-300 px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-50">
            Search
          </button>
        </form>
      </header>

      <nav className="flex flex-wrap gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link
            key={v}
            href={href(v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              view === v
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-sand-300 text-sand-600 hover:border-sand-400 hover:text-sand-900"
            }`}
          >
            {VIEWS[v]}
            {v === "review" && (reviewCount ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-600 px-1.5 py-px text-[10px] font-bold text-white">
                {reviewCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {orders.length === 0 && (
        <p className="rounded-xl border border-dashed border-sand-300 bg-white px-6 py-16 text-center text-sm text-sand-600">
          {q
            ? `No orders match “${q}”.`
            : view === "all"
              ? "No orders yet. They'll appear here as soon as customers check out."
              : `Nothing in “${VIEWS[view]}” right now.`}
        </p>
      )}

      {orders.map((order) => {
        const addr = order.shipping_address
        const manualPending = order.payment_provider === "manual" && order.status === "pending"
        const awaitingApproval = manualPending && !!order.payment_submitted_at
        const txLink = explorerUrl(order.payment_network, order.payment_txid)
        return (
          <div
            key={order.id}
            className={`rounded-2xl border bg-white p-5 ${awaitingApproval ? "border-blue-300 ring-1 ring-blue-100" : "border-sand-200"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-sand-900">{order.order_code}</span>
                  {awaitingApproval ? (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      awaiting approval
                    </span>
                  ) : (
                    <StatusBadge status={order.status} />
                  )}
                  {order.cancellation_requested_at && ["pending", "paid"].includes(order.status) && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <AlertTriangle size={12} strokeWidth={2} className="mr-1 inline" />
                      Cancellation requested
                    </span>
                  )}
                  <span className="text-xs text-sand-600">{new Date(order.created_at).toLocaleString("en-US")}</span>
                </div>
                <p className="mt-1 text-sm text-sand-600">{order.email}</p>
                {addr && (
                  <p className="mt-0.5 text-xs text-sand-600">
                    {addr.first_name} {addr.last_name} · {addr.address_1}
                    {addr.address_2 ? `, ${addr.address_2}` : ""}, {addr.city}, {addr.province} {addr.postal_code}
                  </p>
                )}
                {order.status === "canceled" && order.cancel_reason && (
                  <p className="mt-0.5 text-xs text-red-600">Canceled: {order.cancel_reason}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-sand-900">{formatCartTotal(order.total_cents)}</span>
                {!manualPending && <OrderStatusSelect orderId={order.id} current={order.status} />}
              </div>
            </div>

            {order.payment_provider === "manual" && order.payment_asset && (
              <div className="mt-4 rounded-lg border border-sand-200 bg-sand-50 p-4 text-sm">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[auto,1fr]">
                  <dt className="text-xs font-medium uppercase tracking-wide text-sand-600">Should receive</dt>
                  <dd className="font-semibold text-sand-900">
                    {order.payment_amount_crypto != null &&
                      `${formatCryptoAmount(order.payment_amount_crypto, order.payment_asset)} ${order.payment_asset}`}{" "}
                    <span className="font-normal text-sand-600">on {networkLabel(order.payment_network)}</span>
                  </dd>
                  <dt className="text-xs font-medium uppercase tracking-wide text-sand-600">To address</dt>
                  <dd className="break-all font-mono text-xs text-sand-800">{order.payment_address}</dd>
                  <dt className="text-xs font-medium uppercase tracking-wide text-sand-600">Transaction ID</dt>
                  <dd className="break-all font-mono text-xs text-sand-800">
                    {order.payment_txid ? (
                      <>
                        {order.payment_txid}
                        {txLink && (
                          <a
                            href={txLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 font-sans text-xs font-medium text-brand-700 underline"
                          >
                            Check on blockchain <ExternalLink size={11} />
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="font-sans text-sand-600">Not submitted yet</span>
                    )}
                  </dd>
                  {order.approved_at && (
                    <>
                      <dt className="text-xs font-medium uppercase tracking-wide text-sand-600">Approved</dt>
                      <dd className="text-xs text-sand-800">{new Date(order.approved_at).toLocaleString("en-US")}</dd>
                    </>
                  )}
                </dl>
                {manualPending && (
                  <div className="mt-4 border-t border-sand-200 pt-4">
                    {awaitingApproval && (
                      <p className="mb-3 text-xs text-sand-600">
                        On the blockchain, confirm the payment went <strong>to the address above</strong>, is
                        for the right amount, and is confirmed. Anyone can paste a transaction ID.
                      </p>
                    )}
                    <ManualPaymentReview orderId={order.id} hasTxid={!!order.payment_txid} canApprove={canApprove} />
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-sand-100 pt-3">
              <OrderTrackingForm
                orderId={order.id}
                trackingNumber={order.tracking_number}
                trackingCarrier={order.tracking_carrier}
              />
              <ReprintButton orderId={order.id} />
            </div>

            <div className="mt-4 divide-y divide-sand-100 rounded-lg bg-sand-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-sand-700">
                    {item.product_title}
                    {item.variant_title ? ` — ${item.variant_title}` : ""}
                    <span className="text-sand-600"> × {item.quantity}</span>
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
