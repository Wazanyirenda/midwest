"use client"

import { useState, useTransition } from "react"
import { updateSetting } from "@/app/actions/admin-settings"

export function AnnouncementField({ initial }: { initial: string }) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = text !== initial

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateSetting("announcementText", text)
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
      <label htmlFor="announcement" className="block text-sm font-medium text-sand-900">
        Announcement text
      </label>
      <p className="mt-0.5 text-xs text-sand-600">
        Shown in the banner when the toggle above is on. Keep it short.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="announcement"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          placeholder="Free shipping on orders over $200"
          className="flex-1 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
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
