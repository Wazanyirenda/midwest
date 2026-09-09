import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"

/**
 * Read side of the print queue, for the admin Printing page and the dashboard
 * panel. Kept apart from lib/print.ts so the payment webhooks don't pull
 * dashboard queries into their module graph.
 *
 * Deliberately carries the order number and nothing else about the customer:
 * the label already went out with their address on it, and a printing log has
 * no reason to repeat it on screen.
 */

export type PrintJobRow = {
  id: string
  order_id: string | null
  display_id: number | null
  status: PrintJobStatus
  attempts: number
  last_error: string | null
  created_at: string
  printed_at: string | null
}

export const PRINT_STATUSES = ["queued", "claimed", "printed", "failed"] as const
export type PrintJobStatus = (typeof PRINT_STATUSES)[number]

/** Tabs on the Printing page. `all` is the default view. */
export const PRINT_FILTERS = ["all", "printed", "pending", "failed"] as const
export type PrintFilter = (typeof PRINT_FILTERS)[number]

export function isPrintFilter(value: string | undefined): value is PrintFilter {
  return !!value && (PRINT_FILTERS as readonly string[]).includes(value)
}

export type PrintSummary = {
  printedLast24h: number
  pending: number
  failed: number
  total: number
  lastPrintedAt: string | null
}

const JOB_FIELDS =
  "id,order_id,status,attempts,last_error,created_at,printed_at," +
  "order:orders(display_id)"

type JoinedRow = Omit<PrintJobRow, "display_id"> & {
  order: { display_id: number } | null
}

function flatten(rows: JoinedRow[]): PrintJobRow[] {
  return rows.map(({ order, ...job }) => ({
    ...job,
    display_id: order?.display_id ?? null,
  }))
}

/** Counts for the dashboard panel and the nav badge. */
export async function getPrintSummary(): Promise<PrintSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [printedRes, pendingRes, failedRes, totalRes, lastRes] = await Promise.all([
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "printed")
      .gte("printed_at", since),
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "claimed"]),
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.from("print_jobs").select("id", { count: "exact", head: true }),
    supabase
      .from("print_jobs")
      .select("printed_at")
      .eq("status", "printed")
      .order("printed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    printedLast24h: printedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    failed: failedRes.count ?? 0,
    total: totalRes.count ?? 0,
    lastPrintedAt: lastRes.data?.printed_at ?? null,
  }
}

/** Most recent jobs, newest first, optionally narrowed to one filter tab. */
export async function getPrintJobs(
  filter: PrintFilter = "all",
  limit = 100
): Promise<PrintJobRow[]> {
  let query = supabase
    .from("print_jobs")
    .select(JOB_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (filter === "printed") query = query.eq("status", "printed")
  // 'claimed' is a job already handed to the printer but not yet confirmed —
  // from the owner's side that is still "on its way", so it groups with queued.
  if (filter === "pending") query = query.in("status", ["queued", "claimed"])
  if (filter === "failed") query = query.eq("status", "failed")

  const { data } = await query
  return flatten((data ?? []) as unknown as JoinedRow[])
}
