import { requireAdminOrRedirect } from "@/lib/admin"
import Link from "next/link"
import { CreditCard, Bitcoin, CheckCircle2, Coins, ExternalLink } from "lucide-react"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { formatCartTotal } from "@/lib/cart"
import { getSiteSettings } from "@/lib/settings"
import { explorerUrl, formatCryptoAmount } from "@/lib/crypto-assets"
import { StatusBadge } from "@/components/admin/status-badge"

export const dynamic = "force-dynamic"

// Money is only real once it has been confirmed: approved by hand for crypto,
// or by a signed webhook for a provider.
const SETTLED = ["paid", "shipped", "delivered"]

type TxRow = {
  id: string
  order_code: string
  email: string
  status: string
  total_cents: number
  payment_provider: string | null
  payment_reference: string | null
  payment_asset: string | null
  payment_network: string | null
  payment_amount_crypto: number | string | null
  payment_txid: string | null
  payment_submitted_at: string | null
  created_at: string
}

type EventRow = {
  provider: string
  event_id: string
  type: string | null
  received_at: string
}

function MethodTag({ order }: { order: TxRow }) {
  if (order.payment_provider === "manual") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sand-700">
        <Coins size={12} strokeWidth={2} className="text-amber-600" />
        {order.payment_asset ?? "Crypto"}
      </span>
    )
  }
  if (order.payment_provider === "btcpay" || order.payment_provider === "nowpayments") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sand-600">
        <Bitcoin size={12} strokeWidth={2} className="text-amber-600" />
        {order.payment_provider === "btcpay" ? "BTCPay" : "NOWPayments (old)"}
      </span>
    )
  }
  if (order.payment_provider === "stripe") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sand-600">
        <CreditCard size={12} strokeWidth={2} className="text-brand-600" />
        Card
      </span>
    )
  }
  return <span className="text-xs text-sand-600">—</span>
}

/** For crypto: the customer's transaction, linked to the blockchain. */
function Reference({ order }: { order: TxRow }) {
  if (order.payment_provider === "manual") {
    if (!order.payment_txid) return <span className="text-xs text-sand-500">Not paid yet</span>
    const link = explorerUrl(order.payment_network, order.payment_txid)
    const short = `${order.payment_txid.slice(0, 10)}…`
    return link ? (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title={order.payment_txid}
        className="inline-flex items-center gap-1 font-mono text-xs text-brand-700 hover:underline"
      >
        {short}
        <ExternalLink size={11} />
      </a>
    ) : (
      <span title={order.payment_txid} className="font-mono text-xs text-sand-600">
        {short}
      </span>
    )
  }
  return order.payment_reference ? (
    <span title={order.payment_reference} className="font-mono text-xs text-sand-600">
      {order.payment_reference.slice(0, 14)}…
    </span>
  ) : (
    <span className="text-xs text-sand-500">none</span>
  )
}

export default async function AdminPaymentsPage() {
  await requireAdminOrRedirect()

  const [ordersRes, eventsRes, settings] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_code,email,status,total_cents,payment_provider,payment_reference," +
          "payment_asset,payment_network,payment_amount_crypto,payment_txid,payment_submitted_at,created_at"
      )
      // Archived orders are put away on the Orders page, so they're put away here too.
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    // The raw signed-callback log — proof of what each provider actually told us.
    supabase
      .from("webhook_events")
      .select("provider,event_id,type,received_at")
      .neq("provider", "manual")
      .order("received_at", { ascending: false })
      .limit(50),
    getSiteSettings(),
  ])

  const orders = (ordersRes.data ?? []) as unknown as TxRow[]
  const events = (eventsRes.data ?? []) as unknown as EventRow[]

  const settled = orders.filter((o) => SETTLED.includes(o.status))
  const collected = settled.reduce((sum, o) => sum + o.total_cents, 0)
  const pendingManual = orders.filter((o) => o.status === "pending" && o.payment_provider === "manual")
  const toApprove = pendingManual.filter((o) => o.payment_submitted_at)
  const awaitingPayment = pendingManual.filter((o) => !o.payment_submitted_at)
  const refunded = orders.filter((o) => o.status === "refunded")

  // Paid crypto, split by coin: "3 BTC · 1 USDT".
  const byCoin = new Map<string, number>()
  for (const o of settled) {
    if (o.payment_provider !== "manual" || !o.payment_asset) continue
    byCoin.set(o.payment_asset, (byCoin.get(o.payment_asset) ?? 0) + 1)
  }
  const coinBreakdown = [...byCoin.entries()].map(([coin, n]) => `${n} ${coin}`).join(" · ")

  // Card and BTCPay are only mentioned once they're switched on, or once they
  // have history worth showing.
  const showProviders =
    settings.cardPaymentsEnabled || settings.cryptoPaymentsEnabled || events.length > 0

  const tiles = [
    { label: "Collected", value: formatCartTotal(collected), hint: `${settled.length} paid orders` },
    {
      label: "Paid in crypto",
      value: String(settled.filter((o) => o.payment_provider === "manual").length),
      hint: coinBreakdown || "BTC, USDT and USDC",
    },
    {
      label: "To approve",
      value: String(toApprove.length),
      hint: "Transaction ID submitted",
      href: "/admin/orders?view=review",
      highlight: toApprove.length > 0,
    },
    {
      label: "Awaiting payment",
      value: String(awaitingPayment.length),
      hint: `Auto-cancels after ${settings.unpaidOrderCancelHours} hours`,
      href: "/admin/orders?view=unpaid",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Payments</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          Every order&apos;s payment: what was due, what was sent, and the blockchain transaction to check it
          against.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((s) => {
          const inner = (
            <>
              <p className="text-xs font-medium text-sand-600">{s.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-sand-900">{s.value}</p>
              <p className="mt-1 text-xs text-sand-600">{s.hint}</p>
            </>
          )
          const cls = `rounded-xl border bg-white p-4 ${
            s.highlight ? "border-blue-300 ring-1 ring-blue-100" : "border-sand-200"
          }`
          return s.href ? (
            <Link key={s.label} href={s.href} className={`${cls} transition-colors hover:bg-sand-50`}>
              {inner}
            </Link>
          ) : (
            <div key={s.label} className={cls}>
              {inner}
            </div>
          )
        })}
      </div>

      {refunded.length > 0 && (
        <p className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
          <strong>{refunded.length}</strong> refunded {refunded.length === 1 ? "order" : "orders"} — excluded
          from collected.
        </p>
      )}

      <section className="rounded-xl border border-sand-200 bg-white">
        <header className="border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-sand-900">Transactions</h2>
        </header>
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-sand-600">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-sand-600">
                <tr className="border-b border-sand-100">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Paid with</th>
                  <th className="px-4 py-2.5 font-medium">Crypto due</th>
                  <th className="px-4 py-2.5 font-medium">Transaction</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(o.order_code)}`}
                        className="font-mono text-xs text-sand-700 hover:text-brand-700"
                      >
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sand-600">{o.email}</td>
                    <td className="px-4 py-2.5">
                      <MethodTag order={o} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-sand-700">
                      {o.payment_provider === "manual" && o.payment_amount_crypto != null && o.payment_asset
                        ? `${formatCryptoAmount(o.payment_amount_crypto, o.payment_asset)} ${o.payment_asset}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Reference order={o} />
                    </td>
                    <td className="px-4 py-2.5">
                      {o.status === "pending" && o.payment_submitted_at ? (
                        <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          to approve
                        </span>
                      ) : (
                        <StatusBadge status={o.status} />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-sand-900">
                      {formatCartTotal(o.total_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-sand-600">
                      {new Date(o.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showProviders && (
        <section className="rounded-xl border border-sand-200 bg-white">
          <header className="border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-sand-900">Provider webhook log</h2>
            <p className="mt-0.5 text-xs text-sand-600">
              Signed callbacks from card or BTCPay payments, when those are switched on. Hand-checked crypto
              doesn&apos;t use these.
            </p>
          </header>
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-sand-600">No provider callbacks received yet.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {events.map((e) => (
                <li key={`${e.provider}:${e.event_id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <CheckCircle2 size={14} strokeWidth={2} className="shrink-0 text-brand-600" />
                  <span className="w-24 shrink-0 text-xs capitalize text-sand-600">{e.provider}</span>
                  <span className="min-w-0 flex-1 truncate text-sand-800">{e.type ?? "—"}</span>
                  <span title={e.event_id} className="hidden shrink-0 font-mono text-xs text-sand-600 sm:block">
                    {e.event_id.slice(0, 20)}…
                  </span>
                  <span className="shrink-0 text-xs text-sand-600">
                    {new Date(e.received_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
