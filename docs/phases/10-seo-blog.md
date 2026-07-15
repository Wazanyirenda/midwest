# Phase 10 — SEO & Blog

**Goal:** The site ranks for research peptide keywords. A blog system is live with at least 8–10 foundational articles. Technical SEO is fully implemented.

**Prerequisite:** Phase 09 verified ✅

---

## Tasks

### 10.1 — MDX Blog Setup
- [ ] Install content dependencies:
  ```bash
  pnpm add next-mdx-remote gray-matter reading-time --filter storefront
  pnpm add -D @types/mdx --filter storefront
  ```
- [ ] Create `apps/storefront/content/blog/` directory for MDX files
- [ ] Create `apps/storefront/lib/blog.ts` with helpers:
  - `getAllPosts()` — reads all MDX files, returns sorted list
  - `getPostBySlug(slug)` — reads a single post

### 10.2 — Blog Listing Page
- [ ] Create `apps/storefront/app/blog/page.tsx`:
  - Grid of post cards (title, excerpt, date, reading time, category)
  - Category filter (Educational, Guides, Comparisons, Transparency)
  - ISR caching (`revalidate = 3600`)

### 10.3 — Blog Post Page
- [ ] Create `apps/storefront/app/blog/[slug]/page.tsx`:
  - Full MDX rendering
  - `generateStaticParams()` for all posts
  - `generateMetadata()` with title, description, OG image per post
  - Article JSON-LD schema
  - Reading time display
  - Last updated date
  - "Research Use Only" disclaimer at the top of every post
  - Related products section (internal links)

### 10.4 — Foundational Content (Priority Order)
Write and add these MDX files to `content/blog/`:

**Must publish first (commercial + informational):**
- [ ] `what-is-bpc-157.mdx` — "What is BPC-157? A Research Overview"
- [ ] `what-is-tb-500.mdx` — "TB-500 (Thymosin Beta-4): Research Summary"
- [ ] `what-is-semaglutide.mdx` — "Semaglutide: GLP-1 Receptor Agonist Research"
- [ ] `how-to-reconstitute-peptides.mdx` — "How to Reconstitute Research Peptides"
- [ ] `peptide-storage-guide.mdx` — "Peptide Storage & Stability Guide"
- [ ] `bpc-157-vs-tb-500.mdx` — "BPC-157 vs TB-500: Comparative Research"

**Second batch:**
- [ ] `understanding-certificates-of-analysis.mdx` — "How to Read a Peptide COA"
- [ ] `how-we-test-our-peptides.mdx` — "Our Testing & Quality Standards"
- [ ] `choosing-a-peptide-supplier.mdx` — "What to Look for in a Research Peptide Supplier"
- [ ] `peptide-research-2026.mdx` — "State of Peptide Research in 2026"

### 10.5 — Technical SEO

**Sitemap:**
- [ ] Create `apps/storefront/app/sitemap.ts` that includes:
  - All product pages
  - All blog posts
  - Static pages (home, products, blog, privacy, terms)

**Robots.txt:**
- [ ] Create `apps/storefront/app/robots.ts`:
  - Allow all crawlers
  - Disallow `/account`, `/checkout`, `/cart`, `/api`

**Structured Data:**
- [ ] Add `Product` JSON-LD schema to each product detail page (name, description, offers)
- [ ] Add `Article` JSON-LD schema to each blog post
- [ ] Add `FAQPage` JSON-LD to FAQ sections where present
- [ ] Add `Organization` JSON-LD to homepage

**Meta:**
- [ ] Every page has a unique `<title>` and `<meta name="description">`
- [ ] All product and blog pages have `og:title`, `og:description`, `og:image`
- [ ] Canonical URLs set on all pages

### 10.6 — Internal Linking Strategy
- [ ] Each product detail page links to relevant blog posts
- [ ] Each blog post links to 2–3 relevant product pages
- [ ] Blog listing links to product catalog

---

## Verification Checklist

- [ ] `http://localhost:3000/blog` → lists all posts
- [ ] Each blog post page renders correctly with MDX content
- [ ] Each post has a disclaimer at the top
- [ ] `http://localhost:3000/sitemap.xml` → valid sitemap with all URLs
- [ ] `http://localhost:3000/robots.txt` → valid, blocks private routes
- [ ] Product pages have JSON-LD `Product` schema (check with Chrome DevTools → Elements → search `application/ld+json`)
- [ ] Blog posts have JSON-LD `Article` schema
- [ ] At least 8 foundational posts published
- [ ] No content makes medical or therapeutic claims
- [ ] All blog posts have "Research Use Only" disclaimer

---

## Key Files
- `apps/storefront/content/blog/` — MDX content files
- `apps/storefront/lib/blog.ts` — content helpers
- `apps/storefront/app/blog/` — blog pages
- `apps/storefront/app/sitemap.ts` — dynamic sitemap
- `apps/storefront/app/robots.ts` — robots.txt

---

## Compliance Reminder
Every article must:
- Open with a disclaimer: *"For research use only. Not for human consumption."*
- Cite sources for any scientific claims
- Not recommend dosages, protocols, or suggest human use
- Not make therapeutic or medical claims

---

**Next:** [Phase 11 — Production Deployment](./11-production.md)
