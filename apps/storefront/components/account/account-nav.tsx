"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  UserCog,
  LogOut,
} from "lucide-react"
import { signOut } from "@/app/actions/auth"

const LINKS = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile & Settings", icon: UserCog },
]

export function AccountNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:w-56">
      <ul className="flex flex-row flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors lg:border-transparent lg:px-3 ${
                  active
                    ? "border-brand-200 bg-brand-50 font-medium text-brand-800 lg:border-transparent"
                    : "border-sand-200 text-sand-600 hover:bg-sand-50 hover:text-ink"
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className={active ? "text-brand-600" : "text-sand-400"}
                />
                {link.label}
              </Link>
            </li>
          )
        })}

        <li className="lg:mt-2 lg:border-t lg:border-sand-200 lg:pt-2">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg border border-sand-200 px-3 py-2 text-sm text-sand-600 transition-colors hover:bg-sand-50 hover:text-ink lg:border-transparent"
            >
              <LogOut size={16} strokeWidth={1.75} className="text-sand-400" />
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  )
}
