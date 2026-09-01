import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { sendOrderConfirmationEmail } from "@/lib/email"

// Needs the Node runtime: signature verification uses crypto over the raw body.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROVIDER = "stripe"

type ProcessResult = {
  status: "processed" | "duplicate" | "already_processed"
  order_id?: string
  display_id?: number
  email?: string
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!secret || !apiKey) {
    console.error("[stripe-webhook] missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY")
    // Config error, not a bad request — let Stripe retry once we've deployed keys.
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 })
  }

  // The signature covers the exact bytes Stripe sent. Parsing as JSON first
  // would re-serialise and break verification.
  const rawBody = await request.text()

  const stripe = new Stripe(apiKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    // Unsigned or tampered. A retry can't fix it, so 400 rather than 500.
    console.warn("[stripe-webhook] signature verification failed:", (error as Error).message)
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent
        const { data, error } = await supabase.rpc("process_payment_success", {
          p_provider: PROVIDER,
          p_event_id: event.id,
          p_event_type: event.type,
          p_payment_reference: intent.id,
          p_amount_cents: intent.amount_received || intent.amount,
        })
        if (error) throw new Error(error.message)

        const result = data as ProcessResult
        // Only a real pending→paid transition sends mail, so a redelivery can't
        // email the customer twice.
        if (result.status === "processed" && result.order_id) {
          await sendConfirmation(result.order_id)
        }
        break
      }

      case "charge.refunded":
      case "charge.dispute.created": {
        const charge = event.data.object as Stripe.Charge
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id
        if (!intentId) break

        const { error } = await supabase.rpc("process_payment_refund", {
          p_provider: PROVIDER,
          p_event_id: event.id,
          p_event_type: event.type,
          p_payment_reference: intentId,
        })
        if (error) throw new Error(error.message)
        break
      }

      case "payment_intent.payment_failed": {
        // Deliberately does not cancel the order: the same PaymentIntent can be
        // retried with another card, and cancelling here would orphan a payment
        // that later succeeds. The order stays pending and surfaces in admin.
        const intent = event.data.object as Stripe.PaymentIntent
        console.warn(
          "[stripe-webhook] payment failed for",
          intent.id,
          intent.last_payment_error?.message ?? ""
        )
        break
      }

      default:
        // Unhandled types are still a successful delivery.
        break
    }
  } catch (error) {
    // The work did not commit. Returning 200 here would tell Stripe the event
    // was handled and stop the retries — stranding a real payment.
    console.error(`[stripe-webhook] ${event.type} ${event.id} failed:`, error)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Confirmation mail is deliberately outside the transaction and never throws:
 * a mail outage must not cause Stripe to retry an already-committed payment.
 */
async function sendConfirmation(orderId: string): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id,display_id,email,subtotal_cents,shipping_cents,total_cents," +
          "items:order_items(product_title,variant_title,quantity,unit_price_cents)"
      )
      .eq("id", orderId)
      .maybeSingle()
    if (!order) return

    await sendOrderConfirmationEmail(
      order as unknown as Parameters<typeof sendOrderConfirmationEmail>[0]
    )
  } catch (error) {
    console.error("[stripe-webhook] confirmation email failed:", error)
  }
}
