import { NextResponse } from "next/server"
import { expireUnpaidOrders } from "@/lib/manual-payments"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Cancels manual crypto orders left unpaid past the owner's cut-off, and emails
 * each customer. Orders with a submitted transaction ID are never touched —
 * those wait for a person.
 */
async function handler(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/expire-unpaid] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await expireUnpaidOrders())
  } catch (e) {
    console.error("[cron/expire-unpaid] failed:", e)
    return NextResponse.json({ error: "expire failed" }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
