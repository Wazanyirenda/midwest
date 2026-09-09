import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { getSiteSettings } from "@/lib/settings"
import {
  getPrintJobs,
  getPrintSummary,
  isPrintFilter,
  PRINT_FILTERS,
  type PrintFilter,
  type PrintJobRow,
} from "@/lib/print-log"
import { StatTile } from "@/components/admin/stat-tile"
import { PrintStatusBadge } from "@/components/admin/print-status-badge"
import { ReprintButton } from "@/components/admin/reprint-button"

export const dynamic = "force-dynamic"

const TAB_LABELS: Record<PrintFilter, string> = {
  all: "All",
  printed: "Printed",
  pending: "On its way",
  failed: "Failed",
}

function when(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function Row({ job }: { job: PrintJobRow }) {
  return (
    <tr className="hover:bg-sand-50">
      <td className="px-4 py-2.5 font-mono text-xs text-sand-700">
        {job.display_id ? `#${job.display_id}` : "—"}
      </td>
      <td className="px-4 py-2.5">
        <PrintStatusBadge status={job.status} />
      </td>
      <td className="px-4 py-2.5 text-sand-600">{when(job.created_at)}</td>
      <td className="px-4 py-2.5 text-sand-600">{when(job.printed_at)}</td>
      <td className="px-4 py-2.5 text-sand-600">
        {job.last_error ? (
          <span className="block max-w-md truncate" title={job.last_error}>
            {job.last_error}
          </span>
        ) : job.attempts > 1 ? (
          `${job.attempts} attempts`
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {job.order_id && <ReprintButton orderId={job.order_id} />}
      </td>
    </tr>
  )
}

export default async function AdminPrintingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // Anything else in the URL falls back to 'all' rather than reaching a query.
  const filter: PrintFilter = isPrintFilter(status) ? status : "all"

  const [summary, jobs, settings] = await Promise.all([
    getPrintSummary(),
    getPrintJobs(filter),
    getSiteSettings(),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Printing</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          Every label the shop has sent to the Zebra, and what happened to it.
        </p>
      </header>

      {!settings.autoPrintOrderLabels && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Automatic printing is off — labels only go out when you press Print
          label.{" "}
          <Link href="/admin/settings" className="font-medium underline">
            Turn it on in Settings
          </Link>
        </p>
      )}

      {summary.failed > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>
            <strong>{summary.failed}</strong> label
            {summary.failed === 1 ? "" : "s"} gave up after repeated attempts.
            Check the printer, then press Print label on the affected orders.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Printed"
          value={String(summary.printedLast24h)}
          hint="in the last 24 hours"
        />
        <StatTile label="On its way" value={String(summary.pending)} hint="queued or sending" />
        <StatTile label="Failed" value={String(summary.failed)} hint="needs a look" />
        <StatTile
          label="Last label"
          value={summary.lastPrintedAt ? when(summary.lastPrintedAt) : "Never"}
          hint={`${summary.total} total`}
        />
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {PRINT_FILTERS.map((tab) => (
          <Link
            key={tab}
            href={tab === "all" ? "/admin/printing" : `/admin/printing?status=${tab}`}
            aria-current={filter === tab ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab
                ? "border-sand-900 bg-sand-900 text-white"
                : "border-sand-300 text-sand-700 hover:bg-sand-50"
            }`}
          >
            {TAB_LABELS[tab]}
          </Link>
        ))}
      </nav>

      <section className="rounded-xl border border-sand-200 bg-white">
        {jobs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-sand-600">
            {filter === "all"
              ? "No labels yet. One is queued automatically for every paid order once printing is switched on."
              : "Nothing here."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-sand-600">
                <tr className="border-b border-sand-100">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Queued</th>
                  <th className="px-4 py-2 font-medium">Printed</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {jobs.map((job) => (
                  <Row key={job.id} job={job} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
