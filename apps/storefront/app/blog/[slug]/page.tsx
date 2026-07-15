import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getPostBySlug, getAllPosts, getCategoryLabel, formatDate } from "@/lib/blog"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Post Not Found" }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | Midwestern Peptides Research Library`,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
    },
  }
}

export const revalidate = 3600

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = getAllPosts()
  const related = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3)

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/blog" className="hover:text-gray-700">Research Library</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{post.title}</span>
      </nav>

      {/* Research use disclaimer */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Research Use Only:</strong> This article is for informational and educational
        purposes only. It does not constitute medical advice or instructions for human use.
      </div>

      {/* Post header */}
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3 text-sm text-gray-500">
          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">
            {getCategoryLabel(post.category)}
          </span>
          <span>{post.readingTime} min read</span>
          <span>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{post.title}</h1>
        <p className="mt-3 text-lg text-gray-500">{post.excerpt}</p>
      </header>

      {/* Article body — Phase 10 will render full MDX here */}
      <article className="prose prose-gray max-w-none">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 not-prose">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-semibold text-blue-900">Full Article Coming in Phase 10</p>
              <p className="mt-1 text-sm text-blue-700">
                The complete article content will be added when the MDX blog system is implemented.
                The page structure, SEO metadata, and content infrastructure are all in place.
              </p>
            </div>
          </div>
        </div>

        {/* Placeholder content based on the article type */}
        <h2>Overview</h2>
        <p>
          {post.excerpt} This article provides a comprehensive research overview for scientific
          and educational purposes. All information is sourced from peer-reviewed literature
          and intended for qualified researchers.
        </p>

        <h2>Key Research Areas</h2>
        <ul>
          <li>Molecular structure and properties</li>
          <li>Mechanism of action (as observed in research settings)</li>
          <li>Current state of published scientific literature</li>
          <li>Proper handling and storage for research use</li>
        </ul>

        <h2>Important Note</h2>
        <p>
          All information in this article is provided for educational and research purposes only.
          None of the content should be construed as medical advice, dosage guidance, or
          instructions for human use. These compounds are sold exclusively for laboratory
          research by qualified professionals.
        </p>
      </article>

      {/* Back to blog + related */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        {related.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Articles</h3>
            <div className="space-y-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-brand-300 transition-all group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-brand-700 transition-colors">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.readingTime} min read · {formatDate(p.date)}</p>
                  </div>
                  <span className="text-brand-600 text-sm">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to Research Library
        </Link>
      </div>

      {/* JSON-LD Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            publisher: {
              "@type": "Organization",
              name: "Midwestern Peptides",
            },
          }),
        }}
      />
    </main>
  )
}
