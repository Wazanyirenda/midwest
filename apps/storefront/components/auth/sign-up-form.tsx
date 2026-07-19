"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signUp } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"
import { GoogleButton } from "./google-button"

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "At least 8 characters"),
  marketingOptIn: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { marketingOptIn: false },
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = await signUp(data)
    if (result?.error) {
      setError(result.error)
      return
    }
    setSent(result?.message ?? "Check your email to confirm your account.")
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-md">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><MailCheck size={22} strokeWidth={1.5} /></span>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Confirm your email</h2>
        <p className="text-sm text-gray-600">{sent}</p>
        <p className="mt-4 text-xs text-gray-400">
          Already confirmed?{" "}
          <Link href="/sign-in" className="text-brand-700 hover:underline">
            Sign in
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
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <GoogleButton label="Sign up with Google" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName?.message}>
          <input {...register("firstName")} className={inputCls} placeholder="Jane" />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input {...register("lastName")} className={inputCls} placeholder="Smith" />
        </Field>
      </div>

      <Field label="Email address" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          className={inputCls}
          placeholder="jane@university.edu"
        />
      </Field>

      <Field label="Password" error={errors.password?.message}>
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className={inputCls}
          placeholder="At least 8 characters"
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-gray-600">
        <input
          {...register("marketingOptIn")}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <span>Email me about new products and research updates (optional)</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
