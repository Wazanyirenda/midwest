"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

// Generic scroll-triggered reveal — wraps any element
type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number
  once?: boolean
}

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 28,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: "0px 0px -60px 0px" })

  const offsets = {
    up:    { x: 0,         y: distance  },
    down:  { x: 0,         y: -distance },
    left:  { x: distance,  y: 0         },
    right: { x: -distance, y: 0         },
    none:  { x: 0,         y: 0         },
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Staggered children — wrap a list and each child staggers in
export function StaggerReveal({
  children,
  className,
  stagger = 0.07,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: stagger } },
        hidden:  {},
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
