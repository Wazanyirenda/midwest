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
      {description && <p className="mt-0.5 text-xs text-sand-500">{description}</p>}

      <div className="mt-2 flex items-center gap-2">
        <input
          id={`setting-${field}`}
          type={type}
          value={value}
          min={min}
          max={max}
          maxLength={type === "text" ? 300 : undefined}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className={`rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            type === "number" ? "w-24 tabular-nums" : "flex-1"
          }`}
        />
        {suffix && <span className="text-xs text-sand-500">{suffix}</span>}
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
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
