"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { updateProfile } from "@/app/actions/profile"
import { Field, inputCls } from "@/components/ui/form-field"

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function ProfileForm({ defaults }: { defaults: FormData }) {
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: defaults })

  async function onSubmit(data: FormData) {
    setStatus("idle")
    try {
      await updateProfile(data)
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.first_name?.message}>
          <input {...register("first_name")} className={inputCls} />
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          <input {...register("last_name")} className={inputCls} />
        </Field>
      </div>
      <Field label="Phone (optional)" error={errors.phone?.message}>
        <input {...register("phone")} type="tel" className={inputCls} placeholder="+1 (555) 000-0000" />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && <span className="inline-flex items-center gap-1 text-sm text-brand-700"><Check size={14} strokeWidth={2.5} />Saved</span>}
        {status === "error" && (
          <span className="text-sm text-red-600">Could not save — try again.</span>
        )}
      </div>
    </form>
  )
}
