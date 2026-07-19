"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { forgotPassword } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"

const schema = z.object({
  email: z.string().email("Valid email required"),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const result = await forgotPassword(data)
    setSent(result?.message ?? "If an account exists for that email, a reset link is on its way.")
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-md">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><MailCheck size={22} strokeWidth={1.5} /></span>
        <p className="text-sm text-gray-600">{sent}</p>
        <p className="mt-4 text-xs text-gray-400">
          <Link href="/sign-in" className="text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      <Field label="Email address" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className={inputCls}
          placeholder="jane@university.edu"
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/sign-in" className="text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
