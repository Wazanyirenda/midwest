"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { changePassword } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"

const schema = z
  .object({
    newPassword: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

type FormData = z.infer<typeof schema>

export function ChangePasswordForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setMessage(null)
    setError(null)
    const result = await changePassword({ newPassword: data.newPassword })
    if (result?.error) {
      setError(result.error)
      return
    }
    setMessage(result?.message ?? "Password updated.")
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="New password" error={errors.newPassword?.message}>
        <input
          {...register("newPassword")}
          type="password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="At least 8 characters"
        />
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message}>
        <input
          {...register("confirm")}
          type="password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>

      {message && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          <span className="inline-flex items-center gap-1.5"><Check size={14} strokeWidth={2.5} />{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Change password"}
      </button>
    </form>
  )
}
