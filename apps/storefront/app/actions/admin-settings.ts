"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  getSiteSettings,
  type SiteSettings,
} from "@/lib/settings"
import { STABLECOIN_NETWORKS, isNetwork, isValidAddress, networkLabel } from "@/lib/crypto-assets"
import { sendPaymentAddressChangedAlert } from "@/lib/email"

type Result = { error?: string }

// Ranges for numeric settings — a setting still has to be sane.
const NUMERIC_BOUNDS: Partial<Record<keyof SiteSettings, [number, number]>> = {
  lowStockThreshold: [0, 999],
  abandonedCartDelayHours: [1, 72],
  abandonedCartWindowHours: [2, 336],
  marketingDailyCap: [1, 50000],
  cryptoTolerancePercent: [0, 10],
  printLabelCopies: [1, 5],
  btcQuoteMinutes: [15, 1440],
  unpaidOrderCancelHours: [12, 336],
}

// Longer-form copy needs more room than the 300-character default. Still
// capped — an unbounded textarea is a denial-of-service on the settings row.
const STRING_MAX: Partial<Record<keyof SiteSettings, number>> = {
  disclaimerBody: 8000,
  emailWelcomeBody: 2000,
  emailOrderConfirmationBody: 2000,
  emailOrderShippedBody: 2000,
  emailAbandonedCartBody: 2000,
  emailOrderReceivedBody: 2000,
  orderAlertEmails: 1000,
}

// Settings that must hold an email address when they hold anything at all.
const EMAIL_FIELDS: ReadonlySet<keyof SiteSettings> = new Set(["printAlertEmail"])

// Settings whose value must be one of a fixed set.
const ENUM_VALUES: Partial<Record<keyof SiteSettings, readonly string[]>> = {
  marketingTransport: ["same", "resend"],
  paymentNetworkUsdt: STABLECOIN_NETWORKS.map((n) => n.value),
  paymentNetworkUsdc: STABLECOIN_NETWORKS.map((n) => n.value),
}

// Where customers send money. Each one is checked against its network, and
// every change is emailed to the order inboxes (see sendPaymentAddressChangedAlert).
const PAYMENT_DESTINATIONS: Partial<
  Record<keyof SiteSettings, { label: string; network: (s: SiteSettings) => string }>
> = {
  paymentAddressBtc: { label: "Bitcoin payment address", network: () => "bitcoin" },
  paymentAddressUsdt: { label: "USDT payment address", network: (s) => s.paymentNetworkUsdt },
  paymentAddressUsdc: { label: "USDC payment address", network: (s) => s.paymentNetworkUsdc },
  paymentNetworkUsdt: { label: "USDT payment network", network: () => "" },
  paymentNetworkUsdc: { label: "USDC payment network", network: () => "" },
}

const MAX_ALERT_RECIPIENTS = 5

export async function updateSetting(
  field: keyof SiteSettings,
  value: boolean | string | number
): Promise<Result> {
  await requireAdmin()

  const key = SETTING_KEYS[field]
  if (!key) return { error: `Unknown setting: ${field}` }

  // Reject a value whose type doesn't match the setting's shape.
  if (typeof value !== typeof DEFAULT_SETTINGS[field]) {
    return { error: `Wrong type for ${field}` }
  }

  const allowed = ENUM_VALUES[field]
  if (allowed && (typeof value !== "string" || !allowed.includes(value))) {
    return { error: `Must be one of: ${allowed.join(", ")}` }
  }

  if (field === "orderAlertEmails" && typeof value === "string") {
    const list = value
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean)
    if (list.length > MAX_ALERT_RECIPIENTS) {
      return { error: `Up to ${MAX_ALERT_RECIPIENTS} addresses.` }
    }
    if (list.some((v) => !z.string().email().max(254).safeParse(v).success)) {
      return { error: "Enter email addresses separated by commas." }
    }
    value = list.join(", ")
  }

  const destination = PAYMENT_DESTINATIONS[field]
  const before = destination ? await getSiteSettings() : null
  if (destination && before && typeof value === "string" && field.startsWith("paymentAddress")) {
    value = value.trim()
    const network = destination.network(before)
    if (value !== "" && (!isNetwork(network) || !isValidAddress(network, value))) {
      return {
        error: `That isn't a valid ${networkLabel(network)} address. Copy it from your wallet's Receive screen.`,
      }
    }
  }

  if (EMAIL_FIELDS.has(field) && typeof value === "string" && value.trim() !== "") {
    if (!z.string().email().max(254).safeParse(value.trim()).success) {
      return { error: "Enter a valid email address, or leave it empty." }
    }
    value = value.trim()
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { error: "Enter a number." }
    const bounds = NUMERIC_BOUNDS[field]
    if (bounds && (value < bounds[0] || value > bounds[1])) {
      return { error: `Must be between ${bounds[0]} and ${bounds[1]}.` }
    }
  }

  const stored =
    typeof value === "string"
      ? value.slice(0, STRING_MAX[field] ?? 300)
      : typeof value === "number"
        ? Math.round(value)
        : value

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key, value: stored, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
  if (error) return { error: error.message }

  if (destination && before && before[field] !== stored) {
    const admin = await getUser()
    const previous = String(before[field])
    after(() =>
      sendPaymentAddressChangedAlert({
        label: destination.label,
        previous,
        next: String(stored),
        changedBy: admin?.email ?? "an admin",
      })
    )
  }

  // Settings affect the whole storefront shell, so refresh from the root.
  revalidatePath("/", "layout")
  revalidatePath("/admin/settings")
  return {}
}
