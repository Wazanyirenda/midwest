/**
 * Category chips, in the store's own bronze, at a lighter weight than the
 * buttons. Depth comes from tone, not from hue.
 *
 * Lives under components/ rather than lib/ because Tailwind's content globs
 * only scan app/ and components/ — class names written in lib/ never get
 * generated.
 *
 * Checked against WCAG AA: chip text clears 10.6:1 on its own background, and
 * the dark-strip pills clear 9.3:1 on ink.
 */
type CategoryStyle = {
  /** Chip on a light surface. */
  chip: string
  /** Outlined pill on the dark hero strip. */
  dark: string
}

const WARM: CategoryStyle = {
  chip: "bg-brand-50 text-brand-800 border-brand-200",
  dark: "text-brand-300 border-brand-400/30 hover:border-brand-300",
}

export function categoryStyle(_slug?: string | null): CategoryStyle {
  return WARM
}
