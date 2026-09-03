"use client"

import { useState, useTransition } from "react"
import { setUserRole } from "@/app/actions/admin-roles"
import type { Role } from "@/lib/admin"

export function RoleSelect({
  userId,
  current,
  isSelf,
}: {
  userId: string
  current: Role
  isSelf: boolean
}) {
  const [role, setRole] = useState<Role>(current)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function change(next: Role) {
    const previous = role
    setRole(next)
    setError(null)

    startTransition(async () => {
      const result = await setUserRole(userId, next)
      if (result?.error) {
        setRole(previous)
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <select
        value={role}
        disabled={pending}
        aria-label="Role"
        onChange={(e) => change(e.target.value as Role)}
        className="rounded-lg border border-sand-300 bg-white px-2.5 py-1.5 text-sm text-sand-700 focus:border-brand-500 focus:outline-none disabled:opacity-50"
      >
        <option value="customer">Customer</option>
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
      {isSelf && <p className="mt-1 text-xs text-sand-600">This is you</p>}
      {error && (
        <p role="alert" className="mt-1 max-w-48 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
