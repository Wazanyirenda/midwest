"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createAddress, updateAddress, type AddressInput } from "@/app/actions/addresses"
import { Field, inputCls } from "@/components/ui/form-field"
import { US_STATES } from "@/lib/us-states"

const schema = z.object({
  label: z.string().optional(),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  address_1: z.string().min(1, "Address required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "City required"),
  province: z.string().min(2, "State required").max(2, "Use 2-letter state code"),
  postal_code: z.string().min(5, "ZIP code required"),
  is_default_shipping: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function AddressForm({
  addressId,
  defaults,
  onDone,
}: {
  addressId?: string
  defaults?: Partial<FormData>
  onDone: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_default_shipping: false,
      ...defaults,
    },
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      if (addressId) {
        await updateAddress(addressId, data as AddressInput)
      } else {
        await createAddress(data as AddressInput)
      }
      onDone()
    } catch (e) {
      setError((e as Error).message ?? "Could not save address.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Field label="Label (optional)" error={errors.label?.message}>
        <input {...register("label")} className={inputCls} placeholder="Home, Lab, Office…" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.first_name?.message}>
          <input {...register("first_name")} className={inputCls} />
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          <input {...register("last_name")} className={inputCls} />
        </Field>
      </div>

      <Field label="Phone (optional)" error={errors.phone?.message}>
        <input {...register("phone")} type="tel" className={inputCls} />
      </Field>

      <Field label="Address line 1" error={errors.address_1?.message}>
        <input {...register("address_1")} className={inputCls} placeholder="123 Research Drive" />
      </Field>

      <Field label="Address line 2 (optional)" error={errors.address_2?.message}>
        <input {...register("address_2")} className={inputCls} placeholder="Suite 400" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City" error={errors.city?.message}>
          <input {...register("city")} className={inputCls} />
        </Field>
        <Field label="State" error={errors.province?.message}>
          <select {...register("province")} className={inputCls}>
            <option value="">Select…</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="ZIP code" error={errors.postal_code?.message}>
          <input {...register("postal_code")} className={inputCls} />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm text-gray-700">
        <input
          {...register("is_default_shipping")}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        Use as my default shipping address
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : addressId ? "Save changes" : "Add address"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
