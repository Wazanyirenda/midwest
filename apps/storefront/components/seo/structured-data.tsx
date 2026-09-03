import type { Product } from "@/lib/products"

// JSON-LD. Rendered from server-controlled data only — never user input — so
// there is nothing here for an injected script to ride in on.
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escaping `<` prevents a value from closing the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://midwesternpeptides.com"
  ).replace(/\/$/, "")
}

export function OrganizationJsonLd() {
  const base = baseUrl()
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Midwestern Peptides",
        url: base,
        logo: `${base}/logo.png`,
        description:
          "High-purity research peptides. Third-party tested, batch-verified, COA on every lot.",
      }}
    />
  )
}

export function ProductJsonLd({ product }: { product: Product }) {
  const base = baseUrl()
  const prices = product.variants.map((v) => v.price_cents / 100)
  const inStock = product.variants.some((v) => v.inventory_quantity > 0)

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.subtitle ?? product.description ?? undefined,
        image: product.thumbnail ? [product.thumbnail] : undefined,
        sku: product.variants[0]?.sku,
        brand: { "@type": "Brand", name: "Midwestern Peptides" },
        offers: {
          // AggregateOffer covers the variant price range; a single Offer would
          // misstate a product sold in several sizes.
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: Math.min(...prices).toFixed(2),
          highPrice: Math.max(...prices).toFixed(2),
          offerCount: product.variants.length,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${base}/products/${product.handle}`,
        },
      }}
    />
  )
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; path: string }>
}) {
  const base = baseUrl()
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${base}${item.path}`,
        })),
      }}
    />
  )
}
