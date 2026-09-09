import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google"
import { OrganizationJsonLd } from "@/components/seo/structured-data"
import { CookieConsent } from "@/components/layout/cookie-consent"
import { ConsentProvider } from "@/components/providers/consent"
import { Analytics } from "@/components/providers/analytics"
import { CONSENT_COOKIE, googleAnalyticsId, parseConsent } from "@/lib/consent"
import { getSiteSettings } from "@/lib/settings"
import { AnnouncementBanner } from "@/components/layout/announcement-banner"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SmoothScroll } from "@/components/providers/smooth-scroll"
// @ts-ignore: allow side-effect css import in Next.js app directory
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Headings only. The wordmark in logo.png is a high-contrast serif; Inter
// never matched it.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  // Without this, Next cannot turn the generated opengraph-image into the
  // absolute URL that link unfurlers require.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://midwesternpeptides.com"),
  title: {
    default: "Midwestern Peptides — Research Peptides",
    template: "%s — Midwestern Peptides",
  },
  description:
    "High-purity research peptides. ≥98% purity by HPLC. Third-party tested, batch-verified, COA available on request.",
  keywords: ["research peptides", "BPC-157", "TB-500", "semaglutide", "peptide supplier"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Midwestern Peptides",
  },
  // No twitter.images entry — X falls back to the opengraph image, so the one
  // generated card stays the single source of truth.
  twitter: {
    card: "summary_large_image",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ showCookieBanner }, cookieStore] = await Promise.all([
    getSiteSettings(),
    cookies(),
  ])
  const gaId = googleAnalyticsId()
  // With the banner switched off there is no way to accept, so consent can
  // never be granted and the analytics tag never renders.
  const consent = showCookieBanner
    ? parseConsent(cookieStore.get(CONSENT_COOKIE)?.value)
    : "denied"

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <OrganizationJsonLd />
        <ConsentProvider initial={consent}>
          <SmoothScroll>
            <AnnouncementBanner />
            <Header />
            <div className="min-h-[calc(100vh-var(--header-height))]">
              {children}
            </div>
            <Footer />
          </SmoothScroll>
          {showCookieBanner && <CookieConsent />}
          {gaId && <Analytics measurementId={gaId} />}
        </ConsentProvider>
      </body>
    </html>
  )
}
