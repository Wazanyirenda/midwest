"use client"

import Link from "next/link"
import Image from "next/image"
import { useRef, useState, useTransition } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Reveal, StaggerReveal, StaggerItem } from "@/components/ui/reveal"
import { ArrowRight, Send, FlaskConical, Truck, ClipboardCheck, Check, BookOpen } from "lucide-react"
import { subscribeToNewsletter } from "@/app/actions/newsletter"
import { ProductCard, PRODUCT_GRID_CLS, type CardProduct } from "@/components/store/product-card"
import {
  HealingIcon, RecoveryIcon, HelixIcon,
  ReceptorIcon, NeuronIcon, HourglassIcon,
} from "@/components/store/category-icons"

// ─── Data ──────────────────────────────────────────────────────────────────

export type FeaturedProduct = CardProduct

const HOW_IT_WORKS = [
  {
    title: "Independent testing",
    description: "Every lot verified by an accredited external lab — HPLC purity, mass spec identity, and endotoxin testing on every batch. Not spot checks.",
    icon: FlaskConical,
  },
  {
    title: "Cold-chain shipping",
    description: "Lyophilized peptides shipped in insulated packaging. Overnight available. Plain outer packaging with no product identification.",
    icon: Truck,
  },
  {
    title: "Full batch traceability",
    description: "Lot numbers on every vial. COA for your lot available on request by email. Track your peptide from synthesis date to your door.",
    icon: ClipboardCheck,
  },
]

const TRUST_BADGES = ["HPLC Verified", "3rd Party Tested", "COA on Request", "≥98% Purity"]

// Slugs match products.tags and CATEGORY_TAGS in lib/products.ts
const CATEGORIES = [
  { label: "Healing Peptides", slug: "healing",     icon: HealingIcon,   blurb: "Tissue repair and wound-healing research" },
  { label: "Tissue Recovery",  slug: "recovery",    icon: RecoveryIcon,  blurb: "Muscle and connective tissue models" },
  { label: "Growth Hormone",   slug: "gh",          icon: HelixIcon,     blurb: "GH secretagogues and fragments" },
  { label: "GLP-1 Agonists",   slug: "glp1",        icon: ReceptorIcon,  blurb: "Metabolic and receptor agonist studies" },
  { label: "Nootropics",       slug: "nootropic",   icon: NeuronIcon,    blurb: "Cognitive and neuroprotective research" },
  { label: "Anti-aging",       slug: "anti-aging",  icon: HourglassIcon, blurb: "Longevity and cellular energy compounds" },
]

// ─── Root ──────────────────────────────────────────────────────────────────

export function HomeClient({
  featured,
  posts,
}: {
  featured: FeaturedProduct[]
  posts: PostTeaser[]
}) {
  return (
    <main>
      <Hero />
      <StatsBar />
      <ProductGrid products={featured} />
      <CategoryGrid />
      <HowItWorks />
      <ResearchTeaser posts={posts} />
      <Newsletter />
    </main>
  )
}

export type PostTeaser = {
  slug: string
  title: string
  excerpt: string
  readingTime: number
}

// ─── Hero ─────────────────────────────────────────────────────────────────

function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  // The plate drifts and grows slightly on scroll; the copy stays put.
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-sand-50">
      {/* Full-bleed product plate. Anchored right, where the vial sits, so the
          bright empty half of the frame stays under the copy at every width. */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: imageY, scale: imageScale }}
      >
        <Image
          src="/image.png"
          alt="NAD+ 500mg research vial on a stone plate"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[38%_center] sm:object-[78%_center]"
        />
      </motion.div>

      {/* Scrim. The plate is bright and detailed, so the copy needs its own
          ground — heavier on small screens, where the vial crops inward. */}
      {/* Capped at 30% — the plate's left half is already near-white, so the
          copy stays readable without veiling the vial and helix. */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-white/92 from-0% via-white/78 via-50% to-white/25 to-100%
                   sm:bg-gradient-to-r sm:from-white/30 sm:from-0% sm:via-white/20 sm:via-40% sm:to-transparent sm:to-65%"
      />

      <div className="mx-auto flex min-h-[30rem] max-w-7xl items-center px-4 py-16 sm:min-h-[38rem] sm:px-6 sm:py-28 lg:min-h-[42rem] lg:px-8">
        <div className="max-w-2xl">
          <motion.p
            className="mb-5 max-w-xs font-mono text-2xs font-semibold uppercase leading-relaxed tracking-[0.14em] text-brand-800 sm:max-w-none sm:text-xs sm:tracking-[0.18em]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            North Dakota · Est. 2026 · Lab-tested research peptides
          </motion.p>

          <div className="mb-6 overflow-hidden">
            <motion.h1
              className="text-[2.1rem] font-bold leading-[1.06] tracking-tight text-sand-900 sm:text-6xl sm:leading-[1.03] lg:text-7xl"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              Trusted US supplier of lab-tested peptides.
            </motion.h1>
          </div>

          <motion.div
            className="mb-8 flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
          >
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-sand-300 bg-white px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide text-sand-800 shadow-sm sm:bg-white/90 sm:backdrop-blur"
              >
                {badge}
              </span>
            ))}
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700"
            >
              Shop Peptides <ArrowRight size={14} />
            </Link>
            <Link
              href="/blog"
              className="inline-block rounded-full border-2 border-sand-900 bg-white/90 px-7 py-3 text-sm font-semibold text-sand-900 backdrop-blur transition-colors hover:bg-sand-900 hover:text-white"
            >
              Research Library
            </Link>
          </motion.div>
        </div>
      </div>

      <CategoriesStrip />
    </section>
  )
}

// ─── Categories Strip ──────────────────────────────────────────────────────

function CategoriesStrip() {
  return (
    <div className="relative border-t border-sand-200 bg-white/85 overflow-x-auto no-scrollbar backdrop-blur">
      <div className="flex gap-3 px-4 sm:px-6 lg:px-8 py-4 min-w-max mx-auto max-w-7xl">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?category=${cat.slug}`}
            className="whitespace-nowrap rounded-full border border-brand-600 bg-brand-600 px-4 py-2 font-mono text-xs font-semibold text-white shadow-sm transition-colors hover:border-brand-700 hover:bg-brand-700"
          >
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <div className="border-b border-brand-200/60 bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-stretch divide-x divide-brand-200/70">
          {[
            { value: "Tested Before Release",  detail: "Every batch certified by an independent lab before shipping" },
            { value: "50+ Compounds",           detail: "Wide research catalog, restocked regularly" },
            { value: "≥98% Purity, Every Batch", detail: "HPLC and mass spec verified on every lot" },
          ].map((item) => (
            <div key={item.value} className="px-6 py-5 first:pl-0">
              <p className="text-base font-bold text-sand-900">{item.value}</p>
              <p className="mt-1 max-w-56 font-mono text-xs text-sand-700">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Category Grid ─────────────────────────────────────────────────────────

/**
 * The hero strip is a row of pills that scrolls out of sight. This is the
 * section that actually gets clicked — icons rather than photography, so it
 * stays fast and nothing needs art-directing per category.
 */
function CategoryGrid() {
  return (
    <div className="border-b border-sand-200 bg-sand-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal direction="none">
          <SectionHeading
            title="Shop by research area"
            description="Six categories covering repair, metabolic, cognitive and longevity research — every compound lab-tested and shipped with its certificate."
            href="/products"
            cta="View All Products"
          />
        </Reveal>

        <StaggerReveal stagger={0.05}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <StaggerItem key={cat.slug} className="h-full">
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-sand-200 bg-white p-5 transition-colors hover:border-brand-400 hover:shadow-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 transition-colors group-hover:border-brand-400 group-hover:bg-brand-100">
                    <cat.icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-base font-semibold text-sand-900 transition-colors group-hover:text-brand-700">
                      {cat.label}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-sand-600">
                      {cat.blurb}
                    </span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </div>
        </StaggerReveal>
      </div>
    </div>
  )
}

// ─── Research Teaser ───────────────────────────────────────────────────────

/**
 * The research library is the strongest trust signal this store has and it was
 * reachable only from the nav. Text-only cards: the articles have no header art
 * and inventing some would be three more images to load for no information.
 */
function ResearchTeaser({ posts }: { posts: PostTeaser[] }) {
  if (!posts.length) return null

  return (
    <div className="border-b border-sand-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal direction="none">
          <SectionHeading
            title="From the research library"
            description="Plain-language write-ups of what the published literature actually says — mechanisms, handling, and how to read a certificate of analysis."
            href="/blog"
            cta="Read the Library"
          />
        </Reveal>

        <StaggerReveal stagger={0.06}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {posts.map((post) => (
              <StaggerItem key={post.slug} className="h-full">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-brand-200/70 bg-brand-50 p-6 transition-colors hover:border-brand-300"
                >
                  <span className="mb-3 inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-sand-600">
                    <BookOpen size={13} strokeWidth={2} />
                    {post.readingTime} min read
                  </span>
                  <h3 className="font-sans text-base font-semibold leading-snug text-sand-900 transition-colors group-hover:text-brand-700">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-sand-600">
                    {post.excerpt}
                  </p>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Read article <ArrowRight size={14} strokeWidth={2.5} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </div>
        </StaggerReveal>
      </div>
    </div>
  )
}

// ─── Product Grid ──────────────────────────────────────────────────────────

function ProductGrid({ products }: { products: FeaturedProduct[] }) {
  return (
    <div className="border-b border-sand-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

        <Reveal direction="none">
          <SectionHeading
            title="Featured peptides"
            description="Research compounds our customers reorder most — every lot HPLC-tested and shipped with its certificate of analysis."
            href="/products"
            cta="View All Products"
          />
        </Reveal>

        <StaggerReveal stagger={0.06}>
          <div className={PRODUCT_GRID_CLS}>
            {products.map((p) => (
              <StaggerItem key={p.handle} className="h-full">
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </div>
        </StaggerReveal>

      </div>
    </div>
  )
}

/**
 * Every section leads the same way: a heading, one line explaining the section,
 * and a filled pill to the matching page.
 */
function SectionHeading({
  title,
  description,
  href,
  cta,
}: {
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold text-sand-900 sm:text-3xl">{title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-sand-600">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:self-auto"
      >
        {cta}
        <ArrowRight size={15} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

// ─── How It Works ──────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <div className="border-b border-brand-200/60 bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">

        <Reveal direction="none">
          <SectionHeading
            title="Quality standards"
            description="What every order goes through before it leaves the lab — independent testing, cold-chain handling, and a lot number you can trace."
            href="/blog/understanding-certificates-of-analysis"
            cta="Understanding COAs"
          />
        </Reveal>

        <StaggerReveal stagger={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map((item, i) => (
              <StaggerItem key={i}>
                <div className="flex flex-col items-start">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700">
                    <item.icon size={19} strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-sand-900">{item.title}</h3>
                  <p className="text-sm text-sand-600 leading-relaxed">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerReveal>

      </div>
    </div>
  )
}

// ─── Newsletter ────────────────────────────────────────────────────────────

function Newsletter() {
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const r = await subscribeToNewsletter(email)
      setResult(r)
      if (r.ok) setEmail("")
    })
  }

  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div>
              <p className="font-mono text-xs font-semibold tracking-widest text-sand-400 uppercase mb-2">
                Research updates
              </p>
              <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Join the lab list.</h2>
              <p className="text-sm text-sand-500 max-w-sm">
                Batch releases, restock notifications, and new COA alerts. No spam.
              </p>
            </div>

            <div className="w-full max-w-sm shrink-0">
              {result?.ok ? (
                <p className="rounded-full border border-brand-600/40 bg-brand-600/10 px-5 py-3 text-center text-sm text-brand-400">
                  <span className="inline-flex items-center gap-1.5"><Check size={14} strokeWidth={2.5} />{result.message}</span>
                </p>
              ) : (
                <form
                  onSubmit={onSubmit}
                  className="flex bg-white/5 border border-white/10 text-sm p-1 rounded-full"
                >
                  <input
                    className="flex-1 pl-5 outline-none bg-transparent placeholder-sand-500 text-white text-sm"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@lab.edu"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="font-semibold bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full transition flex items-center gap-2 shrink-0 text-sm disabled:opacity-50"
                  >
                    <Send size={13} />
                    {pending ? "Joining…" : "Subscribe"}
                  </button>
                </form>
              )}
              {result && !result.ok && (
                <p className="mt-2 pl-5 text-xs text-red-400">{result.message}</p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
