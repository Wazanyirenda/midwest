import type { NextConfig } from "next"

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null
  } catch {
    return null
  }
}

const supabaseHost = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL)

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Avatar uploads post the image through a server action (default is 1 MB).
      bodySizeLimit: "3mb",
    },
  },
  images: {
    // This project's storage only. A *.supabase.co wildcard would let anyone
    // with a free Supabase project feed files to the optimizer — the path the
    // sharp/librsvg RCE (CVE-2026-96889) is reached through.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
    // Product masters are 2560px JPEGs; the optimizer serves them re-encoded at
    // the size actually rendered. AVIF first, WebP for browsers without it.
    formats: ["image/avif", "image/webp"],
    // Storage paths are UUID-unique, so an optimized variant never goes stale.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com https://*.supabase.co " +
                "https://www.google-analytics.com https://*.analytics.google.com " +
                "https://*.google-analytics.com https://www.googletagmanager.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
