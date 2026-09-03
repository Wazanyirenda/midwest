import type { MetadataRoute } from "next"
import { listProducts } from "@/lib/products"
import { getAllPosts } from "@/lib/blog"

export const dynamic = "force-dynamic"

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://midwesternpeptides.com"
  ).replace(/\/$/, "")
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl()

  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/products", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/shipping", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" as const },
  ]

  // listProducts already filters to published, and honours the hide-out-of-stock
  // setting — a hidden product should not be advertised in the sitemap either.
  const [products, posts] = await Promise.all([
    listProducts().catch(() => []),
    Promise.resolve(getAllPosts()).catch(() => []),
  ])

  return [
    ...staticRoutes.map((r) => ({
      url: `${base}${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.handle}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
