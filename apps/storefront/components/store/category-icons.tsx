/**
 * Category icons, drawn here rather than pulled from an icon set.
 *
 * Six glyphs did not justify a second icon dependency alongside lucide, and
 * hand-drawing them means the motifs are actually about this catalogue — a
 * helix for growth hormone, a receptor for GLP-1 — instead of the nearest
 * generic match a library happened to have.
 *
 * All share a 24x24 box, 1.5 stroke, round caps and currentColor, so they sit
 * at the same visual weight as the lucide icons used elsewhere.
 */
type IconProps = { className?: string; size?: number }

function Svg({ children, size = 20, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Healing — a cross held inside a protective round. */
export function HealingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  )
}

/** Recovery — a cycle that closes on itself. */
export function RecoveryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.5 3v3.6h-3.6M6.5 21v-3.6h3.6" />
    </Svg>
  )
}

/** Growth hormone — the double helix, echoing the wordmark. */
export function HelixIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3c0 4.5 10 5.5 10 9s-10 4.5-10 9" />
      <path d="M17 3c0 4.5-10 5.5-10 9s10 4.5 10 9" />
      <path d="M8.6 7h6.8M8.6 17h6.8M7.4 12h9.2" />
    </Svg>
  )
}

/** GLP-1 — a ligand meeting its receptor. */
export function ReceptorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="17.5" cy="12" r="3" />
      <path d="M8.2 8.4 14.9 11M8.2 15.6 14.9 13" />
    </Svg>
  )
}

/** Nootropics — a neuron firing. */
export function NeuronIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5V4M12 15.5V20M8.5 12H4M15.5 12H20M9.5 9.5 6.5 6.5M14.5 14.5l3 3M14.5 9.5l3-3M9.5 14.5l-3 3" />
    </Svg>
  )
}

/** Anti-aging — time, held. */
export function HourglassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 3h11M6.5 21h11" />
      <path d="M7.5 3c0 4 4.5 5.4 4.5 9s-4.5 5 -4.5 9" />
      <path d="M16.5 3c0 4-4.5 5.4-4.5 9s4.5 5 4.5 9" />
    </Svg>
  )
}
