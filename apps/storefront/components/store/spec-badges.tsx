/**
 * Verification pills under a product name. Peptides only — lab supplies have
 * no purity or COA to claim.
 */
export function SpecBadges({ purity }: { purity: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge>3rd-party tested</Badge>
      <Badge>COA</Badge>
      <Badge>{purity}</Badge>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-sand-200 bg-sand-50 px-2 py-1 font-mono text-2xs uppercase tracking-wide text-sand-700">
      {children}
    </span>
  )
}
