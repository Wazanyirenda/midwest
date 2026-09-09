import type { Metadata } from "next"
import { HomeClient, type FeaturedProduct } from "@/components/home/home-client"
import { listProducts, lowestVariantPrice, categoryLabel } from "@/lib/products"

export const metadata: Metadata = {
  title: "Midwestern Peptides — Research Peptides",
  description: "High-purity research peptides. ≥98% purity by HPLC. Third-party tested, batch-verified.",
}

export const revalidate = 3600

// Eight, so the grid fills two even rows of four.
const FEATURED = [
  { handle: "bpc-157",      badge: "Best seller" },
  { handle: "tb-500",       badge: null },
  { handle: "ipamorelin",   badge: null },
  { handle: "cjc-1295-dac", badge: null },
  { handle: "nad-plus",     badge: null },
  { handle: "glp-3",        badge: "New" },
  { handle: "ghk-cu",       badge: null },
  { handle: "tesamorelin",  badge: null },
]

export default async function HomePage() {
  const products = await listProducts()

  const featured: FeaturedProduct[] = FEATURED.flatMap(({ handle, badge }) => {
    const p = products.find((prod) => prod.handle === handle)
    if (!p) return []
    return [{
      handle: p.handle,
      title: p.title,
      label: categoryLabel(p),
      priceCents: lowestVariantPrice(p),
      variantCount: p.variants.length,
      thumbnail: p.thumbnail,
      badge,
      showSpecs: p.category === "peptide",
      onlyVariantId: p.variants.length === 1 ? (p.variants[0]?.id ?? null) : null,
      inStock: p.variants.some((v) => v.inventory_quantity > 0),
    }]
  })

  return <HomeClient featured={featured} />
}
