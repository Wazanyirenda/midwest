"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { DEFAULT_SETTINGS, SETTING_KEYS, type SiteSettings } from "@/lib/settings"

type Result = { error?: string }

// Ranges for numeric settings — a setting still has to be sane.
const NUMERIC_BOUNDS: Partial<Record<keyof SiteSettings, [number, number]>> = {
  abandonedCartDelayHours: [1, 72],
  abandonedCartWindowHours: [2, 336],
  marketingDailyCap: [1, 50000],
}

// Settings whose value must be one of a fixed set.
const ENUM_VALUES: Partial<Record<keyof SiteSettings, readonly string[]>> = {
  marketingTransport: ["same", "resend"],
}

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

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { error: "Enter a number." }
    const bounds = NUMERIC_BOUNDS[field]
    if (bounds && (value < bounds[0] || value > bounds[1])) {
      return { error: `Must be between ${bounds[0]} and ${bounds[1]}.` }
    }
  }

  const stored =
    typeof value === "string"
      ? value.slice(0, 300)
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

  // Settings affect the whole storefront shell, so refresh from the root.
  revalidatePath("/", "layout")
  revalidatePath("/admin/settings")
  return {}
}
