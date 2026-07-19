"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { changeEmail } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"

const schema = z.object({
  newEmail: z.string().email("Valid email required"),
})

type FormData = z.infer<typeof schema>

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setMessage(null)
    setError(null)
    const result = await changeEmail(data)
    if (result?.error) setError(result.error)
    else setMessage(result?.message ?? "Confirmation emails sent.")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-500">
        Current email: <span className="font-medium text-gray-700">{currentEmail}</span>
      </p>
      <Field label="New email address" error={errors.newEmail?.message}>
        <input {...register("newEmail")} type="email" className={inputCls} placeholder="new@email.com" />
      </Field>

      {message && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          {message}
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
        {isSubmitting ? "Sending…" : "Change email"}
      </button>
    </form>
  )
}
