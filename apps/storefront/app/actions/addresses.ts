"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type AddressInput = {
  label?: string
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  is_default_shipping?: boolean
}

// supabaseAdmin bypasses RLS — every query here MUST scope by user_id.

async function clearDefaultShipping(userId: string) {
  await supabaseAdmin
    .from("addresses")
    .update({ is_default_shipping: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_default_shipping", true)
}

async function hasAnyAddress(userId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  return (count ?? 0) > 0
}

export async function createAddress(data: AddressInput) {
  const user = await requireUser()

  // First saved address becomes the default automatically.
  const makeDefault = data.is_default_shipping || !(await hasAnyAddress(user.id))
  if (makeDefault) await clearDefaultShipping(user.id)

  const { error } = await supabaseAdmin.from("addresses").insert({
    user_id: user.id,
    label: data.label?.trim() || null,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    phone: data.phone?.trim() || null,
    address_1: data.address_1.trim(),
    address_2: data.address_2?.trim() || null,
    city: data.city.trim(),
    province: data.province,
    postal_code: data.postal_code.trim(),
    country_code: "us",
    is_default_shipping: makeDefault,
  })
  if (error) throw new Error(`Could not save address: ${error.message}`)

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
}

export async function updateAddress(id: string, data: AddressInput) {
  const user = await requireUser()

  if (data.is_default_shipping) await clearDefaultShipping(user.id)

  const { error } = await supabaseAdmin
    .from("addresses")
    .update({
      label: data.label?.trim() || null,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
      address_1: data.address_1.trim(),
      address_2: data.address_2?.trim() || null,
      city: data.city.trim(),
      province: data.province,
      postal_code: data.postal_code.trim(),
      ...(data.is_default_shipping ? { is_default_shipping: true } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(`Could not update address: ${error.message}`)

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
}

export async function deleteAddress(id: string) {
  const user = await requireUser()

  const { error } = await supabaseAdmin
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(`Could not delete address: ${error.message}`)

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
}

export async function setDefaultShipping(id: string) {
  const user = await requireUser()

  // Clear-then-set: the partial unique index allows only one default per user.
  await clearDefaultShipping(user.id)

  const { error } = await supabaseAdmin
    .from("addresses")
    .update({ is_default_shipping: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(`Could not set default address: ${error.message}`)

  revalidatePath("/account/addresses")
  revalidatePath("/checkout")
}

// Called from checkout step 1 when "save this address" is ticked. Upserts by
// exact street match to avoid piling up duplicates on repeat checkouts.
export async function saveAddressFromCheckout(data: {
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
}) {
  const user = await requireUser()

  const { data: existing } = await supabaseAdmin
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .ilike("address_1", data.address_1.trim())
    .ilike("postal_code", data.postal_code.trim())
    .maybeSingle()

  if (existing) {
    await updateAddress(existing.id, data)
    return
  }

  await createAddress(data)
}
