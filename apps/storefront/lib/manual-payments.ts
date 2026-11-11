import "server-only"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings, type SiteSettings } from "@/lib/settings"
import { isNetwork, isValidAddress, type Asset, type Network } from "@/lib/crypto-assets"
import { sendOrderCanceledEmail } from "@/lib/email"

// Manual crypto checkout. The customer sends coins straight to the store's
// wallet and pastes the transaction ID; a person checks the blockchain and
// approves. Nothing here can mark an order paid — that is approveManualPayment
// in app/actions/manual-payments.ts, behind requireAdmin().

export type PaymentOption = { asset: Asset; network: Network; address: string }

/**
 * The coins checkout may offer right now. A coin with no address, or an
 * address that doesn't match its network, is left out rather than shown — a
 * customer who sends to a mistyped address loses the money for good.
 */
export function paymentOptions(settings: SiteSettings): PaymentOption[] {
  if (!settings.manualPaymentsEnabled) return []

  const candidates: Array<{ asset: Asset; network: string; address: string }> = [
    { asset: "BTC", network: "bitcoin", address: settings.paymentAddressBtc },
    { asset: "USDT", network: settings.paymentNetworkUsdt, address: settings.paymentAddressUsdt },
    { asset: "USDC", network: settings.paymentNetworkUsdc, address: settings.paymentAddressUsdc },
  ]

  return candidates.flatMap((c) =>
    c.address && isNetwork(c.network) && isValidAddress(c.network, c.address)
      ? [{ asset: c.asset, network: c.network, address: c.address.trim() }]
      : []
  )
}

const PRICE_TIMEOUT_MS = 5000

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(PRICE_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.json()
}

/**
 * BTC/USD spot from two independent exchanges, the second only if the first
 * fails. A price we can't get is an error, never a guess: quoting the wrong
 * amount either short-changes the store or overcharges the customer.
 */
async function btcUsdPrice(): Promise<number> {
  const sources: Array<() => Promise<number>> = [
    async () => {
      const body = (await fetchJson("https://api.coinbase.com/v2/prices/BTC-USD/spot")) as {
        data?: { amount?: string }
      }
      return Number(body.data?.amount)
    },
    async () => {
      const body = (await fetchJson("https://api.kraken.com/0/public/Ticker?pair=XBTUSD")) as {
        result?: Record<string, { c?: [string, string] }>
      }
      const pair = body.result ? Object.values(body.result)[0] : undefined
      return Number(pair?.c?.[0])
    },
  ]

  for (const source of sources) {
    try {
      const price = await source()
      // A sanity floor and ceiling: a feed glitch must not quote a $140 order
      // at 1 BTC or at a single satoshi.
      if (Number.isFinite(price) && price > 1000 && price < 10_000_000) return price
    } catch (e) {
      console.error("[manual-payments] BTC price source failed:", e)
    }
  }
  throw new Error("BTC price unavailable")
}

/**
 * How much of the coin to send for a USD amount. Stablecoins are 1:1. BTC is
 * rounded UP to the satoshi, so rounding never leaves the store short.
 */
export async function quoteAmount(asset: Asset, usdCents: number): Promise<number> {
  if (asset !== "BTC") return usdCents / 100
  const price = await btcUsdPrice()
  return Math.ceil((usdCents / 100 / price) * 1e8) / 1e8
}

/** Whether a BTC quote is past its validity window. Stablecoins never expire. */
export function quoteExpired(
  asset: string | null,
  quotedAt: string | null,
  quoteMinutes: number
): boolean {
  if (asset !== "BTC" || !quotedAt) return false
  return Date.now() - new Date(quotedAt).getTime() > quoteMinutes * 60 * 1000
}

// Enough for one daily run to clear any realistic backlog without one run
// emailing hundreds of customers at once.
const EXPIRE_BATCH = 100

/**
 * Cancels manual orders that were never paid. An order whose customer has
 * submitted a transaction ID is left alone however old it is — the money may
 * well be in the wallet, and only a person can say it isn't.
 */
export async function expireUnpaidOrders(): Promise<{ canceled: number }> {
  const { unpaidOrderCancelHours } = await getSiteSettings()
  const cutoff = new Date(Date.now() - unpaidOrderCancelHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .eq("payment_provider", "manual")
    .is("payment_submitted_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(EXPIRE_BATCH)
  if (error) throw new Error(error.message)

  let canceled = 0
  for (const { id } of data ?? []) {
    // Re-checked in the update itself: a customer who submits a payment while
    // this runs keeps their order.
    const { data: row } = await supabase
      .from("orders")
      .update({
        status: "canceled",
        cancel_reason: "No payment received in time",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .is("payment_submitted_at", null)
      .select("id,order_code,email")
      .maybeSingle()
    if (!row) continue
    canceled += 1
    await sendOrderCanceledEmail({ ...row, kind: "unpaid", cancelHours: unpaidOrderCancelHours })
  }
  return { canceled }
}
