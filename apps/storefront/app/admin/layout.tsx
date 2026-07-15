export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
            Midwestern Peptides
          </p>
          <h1 className="text-2xl font-bold text-sand-900">Admin</h1>
        </div>
        <nav className="flex gap-2">
          {[
            { href: "/admin", label: "Overview" },
            { href: "/admin/products", label: "Products & Inventory" },
            { href: "/admin/orders", label: "Orders" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-sand-300 px-4 py-1.5 text-sm text-sand-700 hover:border-brand-500 hover:text-brand-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  )
}
