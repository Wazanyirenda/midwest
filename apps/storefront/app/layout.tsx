import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { SmoothScroll } from "@/components/providers/smooth-scroll"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Midwestern Peptides — Research Peptides",
    template: "%s — Midwestern Peptides",
  },
  description:
    "High-purity research peptides. ≥98% purity by HPLC. Third-party tested, batch-verified, COA on every lot. Research use only.",
  keywords: ["research peptides", "BPC-157", "TB-500", "semaglutide", "peptide supplier"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Midwestern Peptides",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${jetbrainsMono.variable}`}
      >
        <body>
          <SmoothScroll>
            <Header />
            <div className="min-h-[calc(100vh-var(--header-height))]">
              {children}
            </div>
            <Footer />
          </SmoothScroll>
        </body>
      </html>
    </ClerkProvider>
  )
}
