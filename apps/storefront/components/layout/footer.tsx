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

const SOCIAL = [
  {
    label: "Facebook",
    href: "https://www.facebook.com",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.9987 1.66699H12.4987C11.3936 1.66699 10.3338 2.10598 9.55242 2.88738C8.77102 3.66878 8.33203 4.72859 8.33203 5.83366V8.33366H5.83203V11.667H8.33203V18.3337H11.6654V11.667H14.1654L14.9987 8.33366H11.6654V5.83366C11.6654 5.61265 11.7532 5.40068 11.9094 5.2444C12.0657 5.08812 12.2777 5.00033 12.4987 5.00033H14.9987V1.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53247 18.3346 5.83366V14.167C18.3346 16.4682 16.4692 18.3337 14.168 18.3337H5.83464C3.53345 18.3337 1.66797 16.4682 1.66797 14.167V5.83366C1.66797 3.53247 3.53345 1.66699 5.83464 1.66699ZM13.3346 9.47533C13.4375 10.1689 13.319 10.8772 12.9961 11.4995C12.6732 12.1218 12.1623 12.6265 11.536 12.9417C10.9097 13.2569 10.2 13.3667 9.50779 13.2553C8.81557 13.1439 8.1761 12.8171 7.68033 12.3213C7.18457 11.8255 6.85775 11.1861 6.74636 10.4938C6.63497 9.80162 6.74469 9.0919 7.05991 8.46564C7.37512 7.83937 7.87979 7.32844 8.50212 7.00553C9.12445 6.68261 9.83276 6.56415 10.5263 6.66699C11.2337 6.7719 11.8887 7.10154 12.3944 7.60725C12.9001 8.11295 13.2297 8.76789 13.3346 9.47533Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Twitter / X",
    href: "https://twitter.com",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3346 3.33368C18.3346 3.33368 17.7513 5.08368 16.668 6.16701C18.0013 14.5003 8.83464 20.5837 1.66797 15.8337C3.5013 15.917 5.33464 15.3337 6.66797 14.167C2.5013 12.917 0.417969 8.00034 2.5013 4.16701C4.33464 6.33368 7.16797 7.58368 10.0013 7.50034C9.2513 4.00034 13.3346 2.00034 15.8346 4.33368C16.7513 4.33368 18.3346 3.33368 18.3346 3.33368Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.3346 6.66699C14.6607 6.66699 15.9325 7.19378 16.8702 8.13146C17.8079 9.06914 18.3346 10.3409 18.3346 11.667V17.5003H15.0013V11.667C15.0013 11.225 14.8257 10.801 14.5131 10.4885C14.2006 10.1759 13.7767 10.0003 13.3346 10.0003C12.8926 10.0003 12.4687 10.1759 12.1561 10.4885C11.8436 10.801 11.668 11.225 11.668 11.667V17.5003H8.33464V11.667C8.33464 10.3409 8.86142 9.06914 9.7991 8.13146C10.7368 7.19378 12.0086 6.66699 13.3346 6.66699Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.0013 7.50033H1.66797V17.5003H5.0013V7.50033Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.33464 5.00033C4.25511 5.00033 5.0013 4.25413 5.0013 3.33366C5.0013 2.41318 4.25511 1.66699 3.33464 1.66699C2.41416 1.66699 1.66797 2.41318 1.66797 3.33366C1.66797 4.25413 2.41416 5.00033 3.33464 5.00033Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

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

            {/* Social icons */}
            <div className="flex items-center gap-3 mt-6">
              {SOCIAL.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex items-center justify-center w-9 h-9 bg-sand-800 hover:bg-sand-700 hover:scale-105 border border-sand-700 rounded-full transition-all"
                >
                  <s.icon />
                </Link>
              ))}
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
            All products sold by Midwestern Peptides are intended strictly for laboratory
            research and scientific investigation by qualified researchers. These
            statements have not been evaluated by the FDA. By purchasing you confirm you are
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
