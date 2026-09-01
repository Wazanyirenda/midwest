"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Wallet,
  Mail,
  Users,
  Settings,
  ExternalLink,
} from "lucide-react"

// adminOnly items are hidden from staff. The pages enforce this themselves too
// — hiding a link is presentation, not authorization.
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/products", label: "Products", icon: Package, adminOnly: true },
  { href: "/admin/payments", label: "Payments", icon: Wallet, adminOnly: true },
  { href: "/admin/campaigns", label: "Campaigns", icon: Mail, adminOnly: true },
  { href: "/admin/team", label: "Team", icon: Users, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
]

export function AdminSidebar({
  alertCount,
  role,
}: {
  alertCount: number
  role: "staff" | "admin"
}) {
  const pathname = usePathname()
  const items = NAV.filter((item) => role === "admin" || !item.adminOnly)

  return (
    <aside className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-ink-muted bg-ink px-3 py-3 lg:h-screen lg:w-60 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-r lg:px-0 lg:py-6 lg:sticky lg:top-0">
      <div className="hidden px-5 lg:block">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-sand-500">
          Midwestern Peptides
        </p>
        <p className="mt-1 text-lg font-semibold text-sand-50">Console</p>
      </div>

      <nav className="flex flex-row gap-1 lg:mt-8 lg:flex-col lg:gap-0.5 lg:px-3">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon
          const badge = item.href === "/admin/inventory" ? alertCount : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-ink-muted font-medium text-sand-50"
                  : "text-sand-400 hover:bg-ink-soft hover:text-sand-100"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              {item.label}
              {badge > 0 && (
                <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto hidden px-3 lg:block">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sand-500 transition-colors hover:text-sand-200"
        >
          <ExternalLink size={13} strokeWidth={1.75} />
          View storefront
        </Link>
      </div>
    </aside>
  )
}
