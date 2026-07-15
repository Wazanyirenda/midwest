"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Reveal, StaggerReveal, StaggerItem } from "@/components/ui/reveal"
import { ArrowRight, Send, FlaskConical, Truck, ClipboardCheck } from "lucide-react"

// ─── Data ──────────────────────────────────────────────────────────────────

const IMAGE_BASE = "https://jcwoamyegoizodxfqhjn.supabase.co/storage/v1/object/public/product-images"

export type FeaturedProduct = {
  name: string
  category: string
  handle: string
  price: string
  badge: string | null
  thumbnail: string | null
}

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
    description: "Lot numbers on every vial. COA available before you order. Track your peptide from synthesis date to your door.",
    icon: ClipboardCheck,
  },
]

const TRUST_BADGES = ["HPLC Verified", "3rd Party Tested", "COA on Every Lot", "≥98% Purity"]

const CATEGORIES = [
  "Healing Peptides", "Growth Hormone", "GLP-1 Agonists", "Tissue Recovery",
  "Nootropics", "Anti-aging", "COA Verified", "New Arrivals",
]

// ─── Root ──────────────────────────────────────────────────────────────────

export function HomeClient({ featured }: { featured: FeaturedProduct[] }) {
  return (
    <main>
      <Hero />
      <StatsBar />
      <ProductGrid products={featured} />
      <HowItWorks />
      <Newsletter />
    </main>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────

function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const imageRotate = useTransform(scrollYProgress, [0, 1], [0, -3])

  return (
    <section ref={sectionRef} className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* Left: text */}
          <div>
            <motion.p
              className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
            >
              North Dakota · Est. 2024 · Lab-tested research peptides
            </motion.p>

            <div className="overflow-hidden mb-6">
              <motion.h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-white"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                Trusted US supplier of lab-tested peptides.
              </motion.h1>
            </div>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap gap-2 mb-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
            >
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="font-mono text-[10px] tracking-wide text-sand-400 border border-sand-700 px-3 py-1 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4 }}
            >
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-7 py-3 rounded-full transition-colors"
              >
                Shop Peptides <ArrowRight size={14} />
              </Link>
              <Link
                href="/blog"
                className="inline-block border border-white/20 text-sand-300 text-sm px-7 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors"
              >
                Research Library
              </Link>
            </motion.div>
          </div>

          {/* Right: hero image */}
          <motion.div
            className="relative overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            <motion.img
              src={`${IMAGE_BASE}/bg-object.png`}
              alt="NAD+ research peptide vial"
              className="w-full h-auto object-cover"
              style={{ y: imageY, scale: imageScale, rotate: imageRotate }}
            />
          </motion.div>

        </div>
      </div>

      {/* Categories strip */}
      <CategoriesStrip />
    </section>
  )
}

// ─── Categories Strip ──────────────────────────────────────────────────────

function CategoriesStrip() {
  return (
    <div className="border-t border-white/5 overflow-x-auto no-scrollbar">
      <div className="flex gap-3 px-4 sm:px-6 lg:px-8 py-4 min-w-max mx-auto max-w-7xl">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/products?category=${encodeURIComponent(cat)}`}
            className="whitespace-nowrap text-xs font-mono text-sand-500 border border-white/10 px-4 py-2 rounded-full hover:border-brand-600 hover:text-brand-400 transition-colors"
          >
            {cat}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <div className="bg-sand-900 border-b border-sand-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-stretch divide-x divide-white/10">
          {[
            { value: "Tested Before Release",  detail: "Every batch certified by an independent lab before shipping" },
            { value: "50+ Compounds",           detail: "Wide research catalog, restocked regularly" },
            { value: "99%+ Avg. Batch Purity",  detail: "HPLC and mass spec verified on every lot" },
          ].map((item) => (
            <div key={item.value} className="px-6 py-4 first:pl-0">
              <p className="font-semibold text-white text-sm">{item.value}</p>
              <p className="font-mono text-[10px] text-sand-500 mt-0.5 max-w-56">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Product Grid ──────────────────────────────────────────────────────────

function ProductGrid({ products }: { products: FeaturedProduct[] }) {
  return (
    <div className="bg-sand-50 border-b border-sand-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">

        <Reveal direction="none">
          <div className="flex items-baseline justify-between mb-10">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
                Available now
              </p>
              <h2 className="text-xl font-bold text-sand-900">Featured peptides</h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-mono text-brand-700 hover:text-brand-800 underline underline-offset-2"
            >
              View all →
            </Link>
          </div>
        </Reveal>

        <StaggerReveal stagger={0.06}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {products.map((p) => (
              <StaggerItem key={p.handle}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </div>
        </StaggerReveal>

      </div>
    </div>
  )
}

function ProductCard({ product }: { product: FeaturedProduct }) {
  return (
    <Link href={`/products/${product.handle}`} className="group block">
      {/* Image placeholder */}
      <div className="aspect-square w-full rounded-2xl bg-sand-100 border border-sand-200 group-hover:border-brand-400 flex items-center justify-center overflow-hidden relative transition-colors">
        {product.badge && (
          <span className="absolute top-2 right-2 font-mono text-[9px] tracking-widest uppercase text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
            {product.badge}
          </span>
        )}
        {product.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="font-mono text-3xl font-bold text-sand-300 group-hover:scale-110 transition-transform duration-300 select-none">
            {product.name.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <p className="font-medium text-sand-900 group-hover:text-brand-700 transition-colors text-sm leading-tight mt-3">
        {product.name}
      </p>
      <p className="font-mono text-[10px] text-sand-400 uppercase tracking-wider mt-0.5">
        {product.category}
      </p>

      {/* Purity dots */}
      <div className="flex items-center gap-1 mt-1.5">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: i < 4 ? "#16a34a" : "#d9d6cd" }}
          />
        ))}
        <span className="font-mono text-[10px] text-sand-400 ml-1">99%</span>
      </div>

      <p className="font-semibold text-sand-900 text-sm mt-1.5">{product.price}</p>
    </Link>
  )
}

// ─── How It Works ──────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <div className="bg-white border-b border-sand-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">

        <Reveal direction="none">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sand-500 uppercase mb-1">
                Why researchers choose us
              </p>
              <h2 className="text-xl font-bold text-sand-900">Quality standards</h2>
            </div>
            <Link
              href="/blog/understanding-certificates-of-analysis"
              className="text-xs font-mono text-brand-700 hover:text-brand-800 underline underline-offset-2 shrink-0"
            >
              Understanding COAs →
            </Link>
          </div>
        </Reveal>

        <StaggerReveal stagger={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map((item, i) => (
              <StaggerItem key={i}>
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mb-4">
                    <item.icon size={18} className="text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-sand-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-sand-500 leading-relaxed">{item.description}</p>
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
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-sand-600 uppercase mb-2">
                Research updates
              </p>
              <h2 className="text-2xl font-bold text-white mb-2">Join the lab list.</h2>
              <p className="text-sm text-sand-500 max-w-sm">
                Batch releases, restock notifications, and new COA alerts. No spam.
              </p>
            </div>

            <div className="flex bg-white/5 border border-white/10 text-sm p-1 rounded-full w-full max-w-sm shrink-0">
              <input
                className="flex-1 pl-5 outline-none bg-transparent placeholder-sand-600 text-white text-sm"
                type="email"
                placeholder="you@lab.edu"
              />
              <button className="font-semibold bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full transition flex items-center gap-2 shrink-0 text-sm">
                <Send size={13} />
                Subscribe
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
