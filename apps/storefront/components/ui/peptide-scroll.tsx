"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import Link from "next/link"

// ─── Data ──────────────────────────────────────────────────────────────────

const PEPTIDES = [
  {
    name:     "BPC-157",
    label:    "01 — Healing / GI",
    handle:   "bpc-157",
    purity:   "≥98%",
    mw:       "1419.5 g/mol",
    sequence: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
    blurb:    "Body-protective compound. Studied for accelerated tissue repair, GI mucosal healing, and tendon regeneration.",
    accent:   "#16a34a",
  },
  {
    name:     "TB-500",
    label:    "02 — Tissue Recovery",
    handle:   "tb-500",
    purity:   "≥98%",
    mw:       "6981.0 g/mol",
    sequence: "Ac-Ser-Asp-Lys-Pro-Asp-Met-Ala-Glu-Ile-Glu-Lys-Phe-Asp-Lys-Ser-Lys-Leu",
    blurb:    "Synthetic thymosin beta-4. Upregulates actin and promotes angiogenesis in wound-healing research.",
    accent:   "#ca8a04",
  },
  {
    name:     "Semaglutide",
    label:    "03 — GLP-1 Agonist",
    handle:   "semaglutide",
    purity:   "≥97%",
    mw:       "4113.6 g/mol",
    sequence: "His-Aib-Glu-Gly-Thr-Phe-Thr-Ser-Asp-Val-Ser-Ser-Tyr-Leu-Glu-Gly-Gln-Ala-Ala-Lys-Glu",
    blurb:    "GLP-1 receptor agonist with C18 fatty diacid modification. Subject of extensive metabolic research.",
    accent:   "#0ea5e9",
  },
  {
    name:     "Ipamorelin",
    label:    "04 — Growth Hormone",
    handle:   "ipamorelin",
    purity:   "≥98%",
    mw:       "711.9 g/mol",
    sequence: "Aib-His-D-2Nal-D-Phe-Lys-NH₂",
    blurb:    "Selective growth hormone secretagogue. Activates ghrelin receptor without cortisol or prolactin co-release.",
    accent:   "#8b5cf6",
  },
  {
    name:     "CJC-1295",
    label:    "05 — Growth Hormone",
    handle:   "cjc-1295",
    purity:   "≥98%",
    mw:       "3647.1 g/mol",
    sequence: "Tyr-D-Ala-Asp-Ala-Ile-Phe-Thr-Gln-Ser-Tyr-Arg-Lys-Val-Leu-Ala-Gln-Leu-Ser-Ala-Arg-Lys-Leu-Leu-Gln-Asp-Ile-Leu-Ser-Arg",
    blurb:    "GHRH analogue with extended half-life via Drug Affinity Complex (DAC) technology.",
    accent:   "#f97316",
  },
  {
    name:     "Retatrutide",
    label:    "06 — GLP-1/GIP/GCG",
    handle:   "retatrutide",
    purity:   "≥96%",
    mw:       "4859.5 g/mol",
    sequence: "His-Aib-Glu-Gly-Thr-Phe-Thr-Ser-Asp-Tyr-Ser-Ile-Ala-Met-Asp-Lys-Ile-Gln-Lys-Ala-Phe-Val-Gln-Trp-Leu-Ile-Ala-Gly-Gly-Pro-Ser-Ser-Gly-Ala-Pro-Pro-Pro-Ser",
    blurb:    "Triple incretin receptor agonist. Activates GLP-1, GIP, and glucagon receptors simultaneously.",
    accent:   "#ec4899",
  },
]

// ─── Scroll-pinned peptide showcase ───────────────────────────────────────

export function PeptideScrollShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)

  // scrollYProgress goes 0→1 over the full scroll height of the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  // Smooth spring so it doesn't feel janky
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20, restDelta: 0.001 })

  // Each slide occupies 1/N of the total scroll range
  const N = PEPTIDES.length

  return (
    // Tall scroll parent — 500vh gives comfortable time per slide
    <div ref={containerRef} style={{ height: `${N * 100}vh` }}>

      {/* Sticky panel — stays in viewport while parent scrolls */}
      <div className="sticky top-0 h-screen overflow-hidden bg-ink">

        {/* Background counter strip */}
        <div className="absolute inset-0 flex items-center justify-end pr-8 pointer-events-none select-none">
          <ScrollNumber smooth={smooth} n={N} />
        </div>

        {/* Grid lines — purely decorative */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
        </div>

        {/* Slide stack */}
        <div className="absolute inset-0">
          {PEPTIDES.map((p, i) => (
            <PeptideSlide
              key={p.handle}
              peptide={p}
              index={i}
              total={N}
              smooth={smooth}
            />
          ))}
        </div>

        {/* Scroll hint on first view */}
        <ScrollHint smooth={smooth} />

        {/* Progress bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-white/30"
          style={{ scaleX: smooth, transformOrigin: "left" }}
        />
      </div>
    </div>
  )
}

// ─── Individual slide ──────────────────────────────────────────────────────

function PeptideSlide({
  peptide,
  index,
  total,
  smooth,
}: {
  peptide: (typeof PEPTIDES)[number]
  index:  number
  total:  number
  smooth: ReturnType<typeof useSpring>
}) {
  const start  = index       / total
  const mid    = (index + 0.3) / total
  const end    = (index + 1)   / total

  // Opacity: fade in sharply, hold, fade out at the end
  const opacity = useTransform(smooth, [start, mid, end * 0.85, end], [0, 1, 1, 0])
  // Slide content up slightly as this card exits
  const y       = useTransform(smooth, [start, mid, end], ["48px", "0px", "-32px"])
  // Clip the accent bar width based on how far through this slide we are
  const barScale = useTransform(smooth, [start, mid], [0, 1])

  return (
    <motion.div
      className="absolute inset-0 flex items-center"
      style={{ opacity }}
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — text */}
          <motion.div style={{ y }}>
            {/* Label */}
            <p className="font-mono text-[10px] tracking-widest uppercase mb-5"
               style={{ color: peptide.accent }}>
              {peptide.label}
            </p>

            {/* Name */}
            <h2 className="text-5xl sm:text-7xl font-bold text-white leading-none tracking-tight mb-4">
              {peptide.name}
            </h2>

            {/* Accent bar */}
            <div className="h-px w-full bg-white/10 mb-6 overflow-hidden">
              <motion.div
                className="h-full origin-left"
                style={{ scaleX: barScale, backgroundColor: peptide.accent }}
              />
            </div>

            {/* Blurb */}
            <p className="text-sand-400 text-lg leading-relaxed max-w-md mb-8">
              {peptide.blurb}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-8 mb-10">
              <Stat label="Purity"  value={peptide.purity} accent={peptide.accent} />
              <Stat label="MW"      value={peptide.mw}     accent={peptide.accent} />
            </div>

            {/* CTA */}
            <Link
              href={`/products/${peptide.handle}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white border border-white/20 px-6 py-3 hover:border-white/60 transition-colors group"
            >
              View product
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>

          {/* Right — sequence / spec panel */}
          <motion.div style={{ y }} className="hidden lg:block">
            <div className="border border-white/10 p-8">
              <p className="font-mono text-[9px] tracking-widest uppercase text-sand-600 mb-4">
                Amino acid sequence
              </p>
              <p className="font-mono text-[11px] text-sand-400 leading-7 break-all">
                {peptide.sequence}
              </p>
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <SpecRow label="Purity"  value={peptide.purity} />
                  <SpecRow label="MW"      value={peptide.mw}     />
                  <SpecRow label="Testing" value="3rd party"      />
                  <SpecRow label="Form"    value="Lyophilized"    />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-widest uppercase text-sand-600 mb-1">{label}</p>
      <p className="font-mono text-lg font-bold" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-widest uppercase text-sand-600">{label}</p>
      <p className="font-mono text-xs text-sand-300 mt-0.5">{value}</p>
    </div>
  )
}

function ScrollNumber({ smooth, n }: { smooth: ReturnType<typeof useSpring>; n: number }) {
  // Translate a big number behind the content that changes with scroll
  const rawIndex = useTransform(smooth, [0, 1], [1, n])
  const display  = useTransform(rawIndex, (v) => String(Math.round(v)).padStart(2, "0"))

  return (
    <motion.span
      className="font-mono font-bold text-white/4 select-none"
      style={{ fontSize: "clamp(160px, 22vw, 340px)", lineHeight: 1 }}
    >
      {display}
    </motion.span>
  )
}

function ScrollHint({ smooth }: { smooth: ReturnType<typeof useSpring> }) {
  const opacity = useTransform(smooth, [0, 0.05], [1, 0])
  return (
    <motion.div
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      style={{ opacity }}
    >
      <span className="font-mono text-[9px] tracking-widest uppercase text-sand-600">scroll</span>
      <motion.div
        className="w-px h-8 bg-sand-600 origin-top"
        animate={{ scaleY: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  )
}
