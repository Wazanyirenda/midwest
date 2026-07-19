"use client"

import { useState, useTransition } from "react"
import { updateMarketingOptIn } from "@/app/actions/profile"

export function CommunicationPrefs({ optedIn }: { optedIn: boolean }) {
  const [checked, setChecked] = useState(optedIn)
  const [pending, startTransition] = useTransition()

  function onToggle(next: boolean) {
    setChecked(next)
    startTransition(async () => {
      try {
        await updateMarketingOptIn(next)
      } catch {
        setChecked(!next) // revert on failure
      }
    })
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-gray-700">
          <span className="font-medium">Marketing emails</span>
          <br />
          <span className="text-gray-500">
            New products, restocks, and research updates. Order and shipping
            emails are always sent.
          </span>
        </span>
      </label>
    </div>
  )
}
