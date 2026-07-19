"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function updateProfile(data: {
  first_name: string
  last_name: string
  phone?: string
}) {
  const user = await requireUser()

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
  if (error) throw new Error(`Could not update profile: ${error.message}`)

  revalidatePath("/account", "layout")
  revalidatePath("/", "layout")
}

export async function updateMarketingOptIn(optIn: boolean) {
  const user = await requireUser()

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ marketing_email_opt_in: optIn, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) throw new Error(`Could not update preferences: ${error.message}`)

  revalidatePath("/account/profile")
}

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export async function updateAvatar(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser()

  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an image." }
  }
  const ext = AVATAR_TYPES[file.type]
  if (!ext) return { error: "Use a JPEG, PNG, or WebP image." }
  if (file.size > AVATAR_MAX_BYTES) return { error: "Image must be 2 MB or smaller." }

  const path = `${user.id}/avatar.${ext}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  const { data: urlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path)
  // Same storage path is overwritten on re-upload — cache-bust so the new
  // image shows immediately.
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) return { error: `Could not save avatar: ${error.message}` }

  revalidatePath("/account", "layout")
  revalidatePath("/", "layout")
  return {}
}
