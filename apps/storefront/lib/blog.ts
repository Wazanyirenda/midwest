// Static blog posts. Metadata lives here; article bodies (markdown) live in
// lib/blog-content.ts and are attached by getAllPosts/getPostBySlug.

import { POST_BODIES } from "./blog-content"

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: "educational" | "guide" | "comparison" | "transparency" | "industry"
  date: string
  readingTime: number
  published: boolean
  body: string
}

type BlogPostMeta = Omit<BlogPost, "body">

const BLOG_POST_META: BlogPostMeta[] = [
  {
    slug: "what-is-bpc-157",
    title: "What is BPC-157? A Research Overview",
    excerpt:
      "BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide derived from a protective protein found in human gastric juice. This overview covers its molecular structure, research history, and current scientific findings.",
    category: "educational",
    date: "2026-05-01",
    readingTime: 8,
    published: true,
  },
  {
    slug: "what-is-tb-500",
    title: "TB-500 (Thymosin Beta-4): Research Summary",
    excerpt:
      "Thymosin Beta-4 is an actin-sequestering protein involved in cell migration and differentiation. TB-500 is a synthetic fragment studied extensively in the context of tissue repair and regeneration research.",
    category: "educational",
    date: "2026-05-05",
    readingTime: 7,
    published: true,
  },
  {
    slug: "what-is-semaglutide",
    title: "Semaglutide: GLP-1 Receptor Agonist Research",
    excerpt:
      "Semaglutide is a glucagon-like peptide-1 (GLP-1) receptor agonist. This article covers its mechanism of action, molecular structure, and the current landscape of research involving GLP-1 agonists.",
    category: "educational",
    date: "2026-05-08",
    readingTime: 9,
    published: true,
  },
  {
    slug: "how-to-reconstitute-peptides",
    title: "How to Reconstitute Research Peptides",
    excerpt:
      "Proper reconstitution is critical for maintaining peptide integrity and accurate research results. This step-by-step guide covers bacteriostatic water, dilution calculations, and storage best practices.",
    category: "guide",
    date: "2026-05-10",
    readingTime: 6,
    published: true,
  },
  {
    slug: "peptide-storage-guide",
    title: "Peptide Storage & Stability Guide",
    excerpt:
      "Temperature, light exposure, and moisture all affect peptide stability. Learn how to store lyophilized and reconstituted peptides correctly to preserve integrity for research purposes.",
    category: "guide",
    date: "2026-05-12",
    readingTime: 5,
    published: true,
  },
  {
    slug: "bpc-157-vs-tb-500",
    title: "BPC-157 vs TB-500: Comparative Research Overview",
    excerpt:
      "Both BPC-157 and TB-500 are studied for their roles in cellular repair mechanisms. This article compares their molecular targets, research profiles, and the contexts in which each has been studied.",
    category: "comparison",
    date: "2026-05-15",
    readingTime: 10,
    published: true,
  },
  {
    slug: "understanding-certificates-of-analysis",
    title: "How to Read a Peptide Certificate of Analysis (COA)",
    excerpt:
      "A Certificate of Analysis is the primary quality document for any research peptide. Learn how to interpret HPLC purity charts, mass spectrometry data, and what to look for when evaluating a supplier.",
    category: "transparency",
    date: "2026-05-18",
    readingTime: 7,
    published: true,
  },
  {
    slug: "how-we-test-our-peptides",
    title: "Our Testing & Quality Standards",
    excerpt:
      "Every batch of peptides at Midwestern Peptides undergoes independent third-party testing. This article explains our testing methodology, the labs we work with, and how to verify your COA.",
    category: "transparency",
    date: "2026-05-20",
    readingTime: 5,
    published: true,
  },
  {
    slug: "choosing-a-peptide-supplier",
    title: "What to Look for in a Research Peptide Supplier",
    excerpt:
      "Not all peptide suppliers are equal. This guide outlines the key criteria researchers should evaluate: third-party testing, COA availability, purity standards, and transparent business practices.",
    category: "guide",
    date: "2026-05-22",
    readingTime: 6,
    published: true,
  },
  {
    slug: "peptide-research-2026",
    title: "The State of Peptide Research in 2026",
    excerpt:
      "Peptide research has accelerated significantly over the past decade. This overview covers the current landscape of published research, emerging areas of scientific interest, and the regulatory environment.",
    category: "industry",
    date: "2026-05-24",
    readingTime: 11,
    published: true,
  },
]

export const BLOG_POSTS: BlogPost[] = BLOG_POST_META.map((meta) => ({
  ...meta,
  body: POST_BODIES[meta.slug] ?? "",
}))

const CATEGORY_LABELS: Record<BlogPost["category"], string> = {
  educational: "Educational",
  guide: "Practical Guide",
  comparison: "Comparison",
  transparency: "Quality & Transparency",
  industry: "Industry & Research",
}

export function getCategoryLabel(category: BlogPost["category"]): string {
  return CATEGORY_LABELS[category]
}

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.published).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug && p.published)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
