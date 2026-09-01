"use client"

import { useState, useTransition } from "react"
import { updateSetting } from "@/app/actions/admin-settings"
import type { SiteSettings } from "@/lib/settings"

export function SettingSelect({
  field,
  label,
  description,
  initial,
  options,
}: {
  field: keyof SiteSettings
  label: string
  description?: string
  initial: string
  options: Array<{ value: string; label: string; disabled?: boolean; note?: string }>
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function change(next: string) {
    const previous = value
    setValue(next)
    setError(null)
    startTransition(async () => {
      const result = await updateSetting(field, next)
      if (result?.error) {
        setValue(previous)
        setError(result.error)
      }
    })
  }

  const selected = options.find((o) => o.value === value)

  return (
    <div className="py-3.5">
      <label htmlFor={`setting-${field}`} className="block text-sm font-medium text-sand-900">
        {label}
      </label>
      {description && <p className="mt-0.5 text-xs text-sand-500">{description}</p>}

      <select
        id={`setting-${field}`}
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value)}
        className="mt-2 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>

      {selected?.note && (
        <p className="mt-1.5 text-xs text-sand-500">{selected.note}</p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
