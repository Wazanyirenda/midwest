import { requireAdminOrRedirect } from "@/lib/admin"
import Link from "next/link"
import { CreditCard, Bitcoin, AlertCircle, CheckCircle2 } from "lucide-react"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { formatCartTotal } from "@/lib/cart"
import { StatusBadge } from "@/components/admin/status-badge"

export const dynamic = "force-dynamic"

// Money is only real once a signed webhook confirmed it.
const SETTLED = ["paid", "shipped", "delivered"]

type TxRow = {
  id: string
  display_id: number
  email: string
  status: string
  total_cents: number
  payment_provider: string | null
  payment_reference: string | null
  created_at: string
  updated_at: string
}

type EventRow = {
  provider: string
  event_id: string
  type: string | null
  received_at: string
}

function ProviderTag({ provider }: { provider: string | null }) {
  if (provider === "nowpayments") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sand-600">
        <Bitcoin size={12} strokeWidth={2} className="text-amber-600" />
        Crypto
      </span>
    )
  }
  if (provider === "stripe") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-sand-600">
        <CreditCard size={12} strokeWidth={2} className="text-brand-600" />
        Card
      </span>
    )
  }
  return <span className="text-xs text-sand-400">—</span>
}

export default async function AdminPaymentsPage() {
  await requireAdminOrRedirect()

  const [ordersRes, eventsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,display_id,email,status,total_cents,payment_provider," +
          "payment_reference,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    // The raw signed-callback log — proof of what each provider actually told us.
    supabase
      .from("webhook_events")
      .select("provider,event_id,type,received_at")
      .order("received_at", { ascending: false })
      .limit(50),
  ])

  const orders = (ordersRes.data ?? []) as unknown as TxRow[]
  const events = (eventsRes.data ?? []) as unknown as EventRow[]

  const settled = orders.filter((o) => SETTLED.includes(o.status))
  const collected = settled.reduce((sum, o) => sum + o.total_cents, 0)
  const byProvider = {
    stripe: settled.filter((o) => o.payment_provider === "stripe"),
    nowpayments: settled.filter((o) => o.payment_provider === "nowpayments"),
  }
  const awaiting = orders.filter((o) => o.status === "pending")
  const refunded = orders.filter((o) => o.status === "refunded")

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Payments</h1>
        <p className="mt-0.5 text-sm text-sand-500">
          Every transaction across card and crypto, plus the raw webhook log.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Collected", value: formatCartTotal(collected), hint: `${settled.length} settled` },
          { label: "Card", value: String(byProvider.stripe.length), hint: "Stripe" },
          { label: "Crypto", value: String(byProvider.nowpayments.length), hint: "NOWPayments" },
          { label: "Awaiting payment", value: String(awaiting.length), hint: "Not yet confirmed" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-sand-200 bg-white p-4">
            <p className="text-xs font-medium text-sand-500">{s.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-sand-900">{s.value}</p>
            <p className="mt-1 text-xs text-sand-400">{s.hint}</p>
          </div>
        ))}
      </div>

      {refunded.length > 0 && (
        <p className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
          <strong>{refunded.length}</strong> refunded{" "}
          {refunded.length === 1 ? "order" : "orders"} — excluded from collected.
        </p>
      )}

      {/* Transactions */}
      <section className="rounded-xl border border-sand-200 bg-white">
        <header className="border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-sand-900">Transactions</h2>
        </header>
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-sand-500">
            No transactions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-sand-500">
                <tr className="border-b border-sand-100">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Reference</th>
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
                        href="/admin/orders"
                        className="font-mono text-xs text-sand-700 hover:text-brand-700"
                      >
                        #{o.display_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sand-600">{o.email}</td>
                    <td className="px-4 py-2.5">
                      <ProviderTag provider={o.payment_provider} />
                    </td>
                    <td className="px-4 py-2.5">
                      {o.payment_reference ? (
                        <span
                          title={o.payment_reference}
                          className="font-mono text-xs text-sand-400"
                        >
                          {o.payment_reference.slice(0, 18)}…
                        </span>
                      ) : (
                        <span className="text-xs text-sand-300">none</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-sand-900">
                      {formatCartTotal(o.total_cents)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-sand-500">
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

      {/* Webhook log */}
      <section className="rounded-xl border border-sand-200 bg-white">
        <header className="border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-sand-900">Webhook log</h2>
          <p className="mt-0.5 text-xs text-sand-500">
            Signed callbacks received from payment providers. Each is processed
            exactly once; repeat deliveries are ignored.
          </p>
        </header>
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <AlertCircle
              size={20}
              strokeWidth={2}
              className="mx-auto mb-2 text-amber-500"
            />
            <p className="text-sm font-medium text-sand-700">
              No webhooks received yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-sand-500">
              Until a provider webhook arrives, no payment can be marked paid.
              Check that STRIPE_WEBHOOK_SECRET is set and the endpoint is
              registered in the Stripe dashboard.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-sand-100">
            {events.map((e) => (
              <li
                key={`${e.provider}:${e.event_id}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <CheckCircle2
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-brand-600"
                />
                <span className="w-24 shrink-0 text-xs capitalize text-sand-600">
                  {e.provider}
                </span>
                <span className="min-w-0 flex-1 truncate text-sand-800">
                  {e.type ?? "—"}
                </span>
                <span
                  title={e.event_id}
                  className="hidden shrink-0 font-mono text-xs text-sand-400 sm:block"
                >
                  {e.event_id.slice(0, 20)}…
                </span>
                <span className="shrink-0 text-xs text-sand-400">
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
    </div>
  )
}
