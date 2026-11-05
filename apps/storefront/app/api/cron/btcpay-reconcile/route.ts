import { NextResponse } from "next/server"
import { isConfigured } from "@/lib/btcpay"
import { reconcilePendingOrders } from "@/lib/btcpay-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * The backstop for lost webhooks: checks every recent pending crypto order
 * against BTCPay and completes any that were paid while the site wasn't
 * listening. Safe to run as often as the scheduler allows — each payment is
 * processed once whichever path reaches it first.
 */
async function handler(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/btcpay-reconcile] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!isConfigured()) return NextResponse.json({ checked: 0, paid: 0 })

  try {
    return NextResponse.json(await reconcilePendingOrders())
  } catch (e) {
    console.error("[cron/btcpay-reconcile] failed:", e)
    return NextResponse.json({ error: "reconcile failed" }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
