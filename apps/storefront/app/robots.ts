import type { MetadataRoute } from "next"

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://midwesternpeptides.com"
  ).replace(/\/$/, "")
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl()

  // Preview and local deployments must never be indexed — a staging copy
  // outranking production, or leaking draft products, is hard to undo.
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)

  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or valueless paths. These already send noindex headers via
        // their own metadata; listing them here also saves crawl budget.
        disallow: [
          "/admin",
          "/account",
          "/cart",
          "/checkout",
          "/api/",
          "/auth/",
          "/unsubscribe",
          "/wishlist/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
