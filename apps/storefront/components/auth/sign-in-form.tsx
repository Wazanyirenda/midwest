"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "@/app/actions/auth"
import { Field, inputCls } from "@/components/ui/form-field"
import { GoogleButton } from "./google-button"

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
})

type FormData = z.infer<typeof schema>

export function SignInForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? undefined
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = await signIn({ ...data, next })
    // On success signIn redirects and never returns.
    if (result?.error) setError(result.error)
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

      <GoogleButton next={next} label="Sign in with Google" />

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
          autoComplete="current-password"
          className={inputCls}
          placeholder="••••••••"
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="text-brand-700 hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  )
}
