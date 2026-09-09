import { NextResponse } from "next/server"
import { retryPendingPrintJobs } from "@/lib/print"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Re-sends labels whose first delivery failed — the printer was off, out of
 * media, or its Weblink connection was down when the payment landed.
 *
 * Only reaches jobs with a failed attempt behind them, so a label queued for
 * the local agent (attempts = 0) is left alone for the agent to collect.
 */
async function handler(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/print-retry] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const delivered = await retryPendingPrintJobs()
  return NextResponse.json({ delivered })
}

export const GET = handler
export const POST = handler
