import Link from "next/link"
import type { Metadata } from "next"
import {
  Package,
  Heart,
  MapPin,
  Truck,
  ChevronRight,
  Plus,
  LifeBuoy,
  ArrowUpRight,
} from "lucide-react"
import { requireUser, getProfile } from "@/lib/auth"
import { getAccountSummary } from "@/lib/account-stats"
import { formatCartTotal } from "@/lib/cart"

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  processing: "bg-blue-50 text-blue-700 ring-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-brand-50 text-brand-800 ring-brand-200",
  canceled: "bg-red-50 text-red-700 ring-red-200",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-sand-100 text-sand-700 ring-sand-200"
      }`}
    >
      {status}
    </span>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Package
  label: string
  value: string
  hint: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-sand-200 bg-white p-5 transition-colors hover:border-brand-300"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sand-50 text-sand-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
          <Icon size={17} strokeWidth={1.75} />
        </span>
        <ArrowUpRight
          size={15}
          className="text-sand-300 transition-colors group-hover:text-brand-600"
        />
      </div>
      <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-sand-700">{label}</p>
      <p className="mt-0.5 text-xs text-sand-500">{hint}</p>
    </Link>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AccountPage() {
  const user = await requireUser("/account")
  const [profile, summary] = await Promise.all([
    getProfile(user.id),
    getAccountSummary(user),
  ])

  const firstName = profile?.first_name || "there"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-sand-500">
          My account
        </p>
        <h1 className="text-2xl font-bold text-ink">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-sand-600">
          {summary.activeOrderCount > 0
            ? `You have ${summary.activeOrderCount} order${summary.activeOrderCount === 1 ? "" : "s"} in progress.`
            : "Everything is up to date — no orders in progress."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Package}
          label="Orders"
          value={String(summary.orderCount)}
          hint={
            summary.orderCount === 0
              ? "No orders yet"
              : `${formatCartTotal(summary.totalSpentCents)} lifetime`
          }
          href="/account/orders"
        />
        <StatTile
          icon={Truck}
          label="In progress"
          value={String(summary.activeOrderCount)}
          hint="Being prepared or shipped"
          href="/account/orders"
        />
        <StatTile
          icon={Heart}
          label="Wishlist"
          value={String(summary.wishlistCount)}
          hint="Saved for later"
          href="/account/wishlist"
        />
        <StatTile
          icon={MapPin}
          label="Addresses"
          value={String(summary.addressCount)}
          hint={summary.defaultAddress ? "Default set" : "No default yet"}
          href="/account/addresses"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="rounded-xl border border-sand-200 bg-white lg:col-span-2">
          <header className="flex items-center justify-between border-b border-sand-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
            {summary.orderCount > 0 && (
              <Link
                href="/account/orders"
                className="flex items-center gap-0.5 text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                View all
                <ChevronRight size={13} />
              </Link>
            )}
          </header>

          {summary.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sand-50 text-sand-400">
                <Package size={20} strokeWidth={1.5} />
              </span>
              <p className="text-sm font-medium text-sand-800">No orders yet</p>
              <p className="mt-1 max-w-xs text-xs text-sand-500">
                Your orders will appear here with tracking and invoices once you
                place one.
              </p>
              <Link
                href="/products"
                className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-sand-100">
              {summary.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sand-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-ink">
                          #{order.display_id}
                        </span>
                        <StatusPill status={order.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-sand-500">
                        {formatDate(order.created_at)} ·{" "}
                        {order.items
                          .map((i) => `${i.title} × ${i.quantity}`)
                          .join(", ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                      {formatCartTotal(order.total)}
                    </span>
                    <ChevronRight
                      size={15}
                      className="shrink-0 text-sand-300 transition-colors group-hover:text-brand-600"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Side column */}
        <div className="space-y-6">
          {/* Default address */}
          <section className="rounded-xl border border-sand-200 bg-white">
            <header className="flex items-center justify-between border-b border-sand-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">Default shipping</h2>
              <Link
                href="/account/addresses"
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Manage
              </Link>
            </header>
            <div className="px-5 py-4">
              {summary.defaultAddress ? (
                <address className="space-y-0.5 text-sm not-italic text-sand-600">
                  <p className="font-medium text-ink">
                    {summary.defaultAddress.first_name}{" "}
                    {summary.defaultAddress.last_name}
                  </p>
                  <p>{summary.defaultAddress.address_1}</p>
                  {summary.defaultAddress.address_2 && (
                    <p>{summary.defaultAddress.address_2}</p>
                  )}
                  <p>
                    {summary.defaultAddress.city}, {summary.defaultAddress.province}{" "}
                    {summary.defaultAddress.postal_code}
                  </p>
                </address>
              ) : (
                <div>
                  <p className="text-sm text-sand-600">
                    No default address saved yet.
                  </p>
                  <Link
                    href="/account/addresses"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 transition-colors hover:border-brand-400 hover:text-brand-700"
                  >
                    <Plus size={13} />
                    Add address
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Support */}
          <section className="rounded-xl border border-sand-200 bg-white px-5 py-5">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-50 text-sand-500">
              <LifeBuoy size={17} strokeWidth={1.75} />
            </span>
            <h2 className="text-sm font-semibold text-ink">Need a hand?</h2>
            <p className="mt-1 text-xs text-sand-600">
              Questions about an order, a COA, or a product — we usually reply the
              same business day.
            </p>
            <a
              href="mailto:support@midwesternpeptides.com"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              Contact support
              <ChevronRight size={13} />
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
