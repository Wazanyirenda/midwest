"use client"

import { useState, useTransition } from "react"
import { updateSetting } from "@/app/actions/admin-settings"
import type { SiteSettings } from "@/lib/settings"

/**
 * Text or number setting with an explicit save. Generalises the pattern in
 * AnnouncementField so a new non-boolean setting doesn't need a new component.
 */
export function SettingField({
  field,
  label,
  description,
  initial,
  type = "text",
  placeholder,
  min,
  max,
  suffix,
  rows,
  maxLength,
}: {
  field: keyof SiteSettings
  label: string
  description?: string
  initial: string | number
  type?: "text" | "number"
  placeholder?: string
  min?: number
  max?: number
  suffix?: string
  /** Renders a textarea instead of a single-line input. */
  rows?: number
  maxLength?: number
}) {
  const [value, setValue] = useState(String(initial))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = value !== String(initial)

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateSetting(
        field,
        type === "number" ? Number(value) : value
      )
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="py-3.5">
      <label htmlFor={`setting-${field}`} className="block text-sm font-medium text-sand-900">
        {label}
      </label>
      {description && <p className="mt-0.5 text-xs text-sand-600">{description}</p>}

      <div className={`mt-2 gap-2 ${rows ? "flex flex-col items-end" : "flex items-center"}`}>
        {rows ? (
          <textarea
            id={`setting-${field}`}
            value={value}
            rows={rows}
            maxLength={maxLength ?? 300}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm leading-relaxed text-sand-900 placeholder:text-sand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        ) : (
          <input
            id={`setting-${field}`}
            type={type}
            value={value}
            min={min}
            max={max}
            maxLength={type === "text" ? (maxLength ?? 300) : undefined}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className={`rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              type === "number" ? "w-24 tabular-nums" : "flex-1"
            }`}
          />
        )}
        {suffix && <span className="text-xs text-sand-600">{suffix}</span>}
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
