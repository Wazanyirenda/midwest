import { ArrowDownRight, ArrowUpRight } from "lucide-react"

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  hint,
}: {
  label: string
  value: string
  /** Percent change vs the previous period; null when there's no baseline. */
  delta?: number | null
  deltaLabel?: string
  hint?: string
}) {
  const up = (delta ?? 0) >= 0
  const Arrow = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-xl border border-sand-200 bg-white p-4">
      <p className="text-xs font-medium text-sand-500">{label}</p>
      {/* Proportional figures: tabular-nums looks loose at display sizes */}
      <p className="mt-1.5 text-2xl font-semibold text-sand-900">{value}</p>

      {delta !== undefined && (
        <p className="mt-1 flex items-center gap-1 text-xs">
          {delta === null ? (
            <span className="text-sand-400">No prior data</span>
          ) : (
            <>
              <span
                className={`flex items-center gap-0.5 font-medium ${
                  up ? "text-brand-700" : "text-red-600"
                }`}
              >
                <Arrow size={13} strokeWidth={2} />
                {Math.abs(delta)}%
              </span>
              <span className="text-sand-400">{deltaLabel}</span>
            </>
          )}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-sand-400">{hint}</p>}
    </div>
  )
}
