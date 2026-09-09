"use client"

import Script from "next/script"
import { useConsent } from "@/components/providers/consent"

/**
 * GA4, loaded only after the visitor accepts. Declining means the tag never
 * reaches the page at all — no gtag cookie is written and no pageview is sent,
 * which is stricter than Consent Mode's "load but don't store".
 */
export function Analytics({ measurementId }: { measurementId: string }) {
  const { consent } = useConsent()
  if (consent !== "granted") return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
         `gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
    </>
  )
}
