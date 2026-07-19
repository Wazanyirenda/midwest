"use client"

import { useRef, useState, useTransition } from "react"
import { updateAvatar } from "@/app/actions/profile"

export function AvatarUploader({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null
  initial: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const formData = new FormData()
    formData.set("avatar", file)
    startTransition(async () => {
      const result = await updateAvatar(formData)
      if (result?.error) setError(result.error)
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-sand-300 bg-brand-50 text-xl font-semibold text-brand-800">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="hidden"
          id="avatar-input"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {pending ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
        </button>
        <p className="mt-1 text-xs text-gray-400">JPEG, PNG, or WebP — max 2 MB.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
