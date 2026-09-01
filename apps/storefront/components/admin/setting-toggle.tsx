"use client"

import { useState, useTransition } from "react"
import { AlertTriangle } from "lucide-react"
import { updateSetting } from "@/app/actions/admin-settings"
import type { SiteSettings } from "@/lib/settings"

export function SettingToggle({
  field,
  label,
  description,
  warning,
  initial,
}: {
  field: keyof SiteSettings
  label: string
  description: string
  /** Shown only while the toggle is on — for options that promise something. */
  warning?: string
  initial: boolean
}) {
  const [on, setOn] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !on
    setOn(next) // optimistic
    setError(null)

    startTransition(async () => {
      const result = await updateSetting(field, next)
      if (result?.error) {
        setOn(!next) // roll back to what the server still has
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={`setting-${field}`}
          className="block text-sm font-medium text-sand-900"
        >
          {label}
        </label>
        <p className="mt-0.5 text-xs text-sand-500">{description}</p>

        {on && warning && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <AlertTriangle size={13} strokeWidth={2} className="mt-px shrink-0" />
            {warning}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>

      <button
        id={`setting-${field}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={toggle}
        disabled={pending}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          on ? "bg-brand-600" : "bg-sand-300"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
