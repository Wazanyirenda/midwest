import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { sendAbandonedCartEmail } from "@/lib/email"
import { getSiteSettings } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Timing is owner-controlled in /admin/settings. The batch cap is not: it is an
// abuse control, and "off" would mean one run could mail the entire list.
const BATCH_LIMIT = 50

async function handler(request: Request) {
  // Vercel Cron sends the secret as a Bearer token. Without this the endpoint
  // is a public "email all my customers" button.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[cron/abandoned-carts] CRON_SECRET not set — refusing to run")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const settings = await getSiteSettings()
  if (!settings.abandonedCartEmails) {
    return NextResponse.json({ skipped: "disabled in settings" })
  }

  const now = Date.now()
  const hour = 60 * 60 * 1000
  const notAfter = new Date(
    now - settings.abandonedCartDelayHours * hour
  ).toISOString()
  const notBefore = new Date(
    now - settings.abandonedCartWindowHours * hour
  ).toISOString()

  const { data: carts, error } = await supabase
    .from("carts")
    .select(
      "id,email,updated_at," +
        "items:cart_items(quantity,variant:product_variants(price_cents,title," +
        "product:products(title)))"
    )
    .is("completed_at", null)
    .not("email", "is", null)
    .lt("updated_at", notAfter)
    .gt("updated_at", notBefore)
    .limit(BATCH_LIMIT)

  if (error) {
    console.error("[cron/abandoned-carts]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Row = {
    id: string
    email: string
    items: Array<{
      quantity: number
      variant: {
        price_cents: number
        title: string | null
        product: { title: string } | null
      } | null
    }>
  }

  let sent = 0
  let skipped = 0

  for (const cart of (carts ?? []) as unknown as Row[]) {
    if (!cart.items?.length) {
      skipped++
      continue
    }

    // One reminder per cart, ever. Without this check the job re-mails the same
    // cart on every run for two days.
    const { count } = await supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("template", "abandoned_cart")
      .eq("entity_id", cart.id)
    if ((count ?? 0) > 0) {
      skipped++
      continue
    }

    // Token so the mail carries a working one-click unsubscribe.
    const { data: sub } = await supabase
      .from("newsletter_subscribers")
      .select("unsubscribe_token")
      .eq("email", cart.email.toLowerCase())
      .maybeSingle()

    const items = cart.items.map((i) => ({
      product_title: i.variant?.product?.title ?? "Item",
      variant_title: i.variant?.title ?? null,
      quantity: i.quantity,
      unit_price_cents: i.variant?.price_cents ?? 0,
    }))

    // send() checks marketing consent and logs a 'suppressed' row when absent,
    // so an opted-out address costs one no-op call and is never mailed.
    await sendAbandonedCartEmail({
      email: cart.email,
      cartId: cart.id,
      unsubscribeToken: sub?.unsubscribe_token,
      items,
      total_cents: items.reduce((n, i) => n + i.unit_price_cents * i.quantity, 0),
    })
    sent++
  }

  return NextResponse.json({ considered: carts?.length ?? 0, sent, skipped })
}

// Vercel Cron calls this with GET and injects `Authorization: Bearer
// $CRON_SECRET` itself. POST is kept so the job can be triggered by hand with
// the same header.
export const GET = handler
export const POST = handler
