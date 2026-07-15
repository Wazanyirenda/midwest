import Link from "next/link"
import { getAllPosts, getCategoryLabel, formatDate } from "@/lib/blog"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Research Library",
  description:
    "Educational articles, practical guides, and research overviews for peptide science. All content is for informational purposes related to scientific research.",
}

export const revalidate = 3600

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "educational", label: "Educational" },
  { value: "guide", label: "Guides" },
  { value: "comparison", label: "Comparisons" },
  { value: "transparency", label: "Quality & Transparency" },
  { value: "industry", label: "Industry" },
]

const CATEGORY_COLORS: Record<string, string> = {
  educational: "bg-blue-100 text-blue-700",
  guide: "bg-green-100 text-green-700",
  comparison: "bg-purple-100 text-purple-700",
  transparency: "bg-amber-100 text-amber-700",
  industry: "bg-gray-100 text-gray-700",
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Research Library</h1>
        <p className="mt-3 max-w-2xl text-gray-500">
          Educational articles and research overviews for scientists and researchers.
          All content is for informational purposes only.{" "}
          <strong>Not medical advice.</strong>
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/blog" : `/blog?category=${f.value}`}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600
              hover:border-brand-400 hover:text-brand-700 transition-colors"
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Post grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6
              hover:border-brand-300 hover:shadow-sm transition-all"
          >
            {/* Category + reading time */}
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-700"}`}>
                {getCategoryLabel(post.category)}
              </span>
              <span className="text-xs text-gray-400">{post.readingTime} min read</span>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-700 transition-colors flex-1">
              {post.title}
            </h2>

            {/* Excerpt */}
            <p className="mt-2 text-sm text-gray-500 line-clamp-3">
              {post.excerpt}
            </p>

            {/* Date */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
              <span className="text-xs font-medium text-brand-600 group-hover:underline">
                Read more →
              </span>
            </div>
          </Link>
        ))}
      </div>

   
    </main>
  )
}
