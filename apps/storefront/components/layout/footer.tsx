import Link from "next/link"
import Image from "next/image"

const LINKS = {
  Shop: [
    { label: "All Peptides",         href: "/products" },
    { label: "Healing Peptides",     href: "/products?category=healing" },
    { label: "GH Peptides",          href: "/products?category=gh" },
    { label: "GLP-1 Peptides",       href: "/products?category=glp1" },
  ],
  Research: [
    { label: "Research Library",     href: "/blog" },
    { label: "Reconstitution Guide", href: "/blog/how-to-reconstitute-peptides" },
    { label: "Storage Guide",        href: "/blog/peptide-storage-guide" },
    { label: "Understanding COAs",   href: "/blog/understanding-certificates-of-analysis" },
  ],
  Company: [
    { label: "Shipping Policy",      href: "/shipping" },
    { label: "Privacy Policy",       href: "/privacy" },
    { label: "Terms of Service",     href: "/terms" },
    { label: "Contact",              href: "mailto:orders@midwesternpeptides.com" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-ink text-sand-400">

      {/* Link grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Midwestern Peptides"
                width={180}
                height={56}
                className="h-16 w-auto brightness-0 invert"
              />
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-sand-500">
              High-purity research peptides.
              Third-party tested, batch-verified.
              North Dakota, USA.
            </p>
            <div className="mt-4 space-y-1 font-mono text-[10px] text-sand-600">
              <p>≥98% purity by HPLC</p>
              <p>Mass spec verified</p>
              <p>COA on every lot</p>
            </div>

          </div>

          {/* Link cols */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="font-mono text-[10px] tracking-widest text-sand-600 uppercase mb-4">
                {group}
              </p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-sand-500 hover:text-sand-200 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer + copyright */}
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-sand-600 leading-relaxed max-w-3xl">
            By purchasing you confirm you are
            21+ and acquiring these products for lawful research purposes only.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-sand-600">
            <p>© {new Date().getFullYear()} Midwestern Peptides — North Dakota</p>
            <div className="flex gap-4">
              <Link href="/privacy"  className="hover:text-sand-300 transition-colors">Privacy</Link>
              <Link href="/terms"    className="hover:text-sand-300 transition-colors">Terms</Link>
              <Link href="/shipping" className="hover:text-sand-300 transition-colors">Shipping</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
