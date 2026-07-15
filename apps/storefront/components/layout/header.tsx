import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"
import { getCart } from "@/lib/cart"
import { AuthButtons } from "./auth-buttons"
import { MobileNav } from "./mobile-nav"

export async function Header() {
  const cart = await getCart()
  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <div className="sticky top-0 z-50">
      {/* Research-use notice */}
      <div className="bg-ink text-sand-400 px-4 py-1 text-center font-mono text-[10px] tracking-widest uppercase">
        50% off all products for a limited time.
      </div>

      {/* Main nav */}
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Image
                src="/logo.png"
                alt="Midwestern Peptides"
                width={180}
                height={56}
                className="h-16 w-auto"
                priority
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {[
                { label: "Products", href: "/products" },
                { label: "Research", href: "/blog" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sand-600 hover:text-ink transition-colors border-b border-transparent hover:border-ink pb-0.5"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Search — desktop only */}
            <form
              action="/products"
              method="get"
              className="hidden xl:flex items-center gap-2 bg-sand-100 px-4 py-2 rounded-full text-sm w-56 border border-sand-200 focus-within:border-brand-400 transition-colors"
            >
              <Search size={15} className="text-sand-400 shrink-0" />
              <input
                name="q"
                type="text"
                placeholder="Search peptides"
                className="flex-1 bg-transparent outline-none placeholder-sand-400 text-sand-800 text-sm"
              />
            </form>

            {/* Right side */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Cart */}
              <Link href="/cart" aria-label={`Cart${cartCount > 0 ? ` (${cartCount} items)` : ""}`} className="relative text-sand-600 hover:text-ink transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold leading-4 text-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Account / Sign in — always visible */}
              <AuthButtons />

              <MobileNav />
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
