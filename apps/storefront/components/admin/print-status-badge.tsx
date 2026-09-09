import type { PrintJobStatus } from "@/lib/print-log"

// Owner-facing wording rather than the queue's own vocabulary: 'claimed' means
// the printer has the job but hasn't confirmed it, which reads as "sending".
const LABELS: Record<PrintJobStatus, { text: string; className: string }> = {
  queued: { text: "waiting", className: "bg-amber-50 text-amber-700 border-amber-200" },
  claimed: { text: "sending", className: "bg-blue-50 text-blue-700 border-blue-200" },
  printed: { text: "printed", className: "bg-green-50 text-green-700 border-green-200" },
  failed: { text: "failed", className: "bg-red-50 text-red-600 border-red-200" },
}

export function PrintStatusBadge({ status }: { status: PrintJobStatus }) {
  const { text, className } = LABELS[status] ?? LABELS.queued
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  )
}
