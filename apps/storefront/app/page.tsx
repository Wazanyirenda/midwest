import type { Metadata } from "next"
import { HomeClient, type FeaturedProduct } from "@/components/home/home-client"
import { listProducts, lowestVariantPrice } from "@/lib/products"
import { formatPrice } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Midwestern Peptides — Research Peptides",
  description: "High-purity research peptides. ≥98% purity by HPLC. Third-party tested, batch-verified.",
}

export const revalidate = 3600

const FEATURED = [
  { handle: "bpc-157",      badge: "Best seller" },
  { handle: "tb-500",       badge: null },
  { handle: "ipamorelin",   badge: null },
  { handle: "cjc-1295-dac", badge: null },
  { handle: "nad-plus",     badge: null },
  { handle: "retatrutide",  badge: "New" },
]

export default async function HomePage() {
  const products = await listProducts()

  const featured: FeaturedProduct[] = FEATURED.flatMap(({ handle, badge }) => {
    const p = products.find((prod) => prod.handle === handle)
    if (!p) return []
    const lowest = lowestVariantPrice(p)
    return [{
      name: p.title,
      category: p.subtitle ?? "Research peptide",
      handle: p.handle,
      price: lowest != null
        ? `${p.variants.length > 1 ? "From " : ""}${formatPrice(lowest)}`
        : "—",
      badge,
      thumbnail: p.thumbnail,
    }]
  })

  return <HomeClient featured={featured} />
}
