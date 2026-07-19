"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { resetPassword } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = await resetPassword({ password: data.password })
    // On success resetPassword redirects to /account.
    if (result?.error) setError(result.error)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </div>
      )}

      <Field label="New password" error={errors.password?.message}>
        <input
          {...register("password")}
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isSubmitting ? "Saving…" : "Set new password"}
      </button>
    </form>
  )
}
