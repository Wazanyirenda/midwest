"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const BUCKET = "product-images"

type Result = { error?: string }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function revalidateCatalog(handle?: string) {
  revalidatePath("/admin/products")
  revalidatePath("/admin/inventory")
  revalidatePath("/admin")
  revalidatePath("/products")
  if (handle) revalidatePath(`/products/${handle}`)
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function createProduct(formData: FormData): Promise<Result> {
  await requireAdmin()

  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { error: "Title is required." }

  const category = String(formData.get("category") ?? "peptide")
  if (!["peptide", "equipment"].includes(category)) {
    return { error: "Invalid category." }
  }

  const handle = slugify(String(formData.get("handle") ?? "") || title)
  if (!handle) return { error: "Could not derive a URL handle from that title." }

  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => slugify(t))
    .filter(Boolean)

  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      subtitle: String(formData.get("subtitle") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      handle,
      category,
      tags,
      // New products start hidden so you can add images and variants before
      // they appear in the store.
      status: "draft",
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { error: `The handle "${handle}" is already taken.` }
    }
    return { error: error.message }
  }

  revalidateCatalog(handle)
  redirect(`/admin/products/${data.id}`)
}

export async function updateProduct(
  productId: string,
  formData: FormData
): Promise<Result> {
  await requireAdmin()

  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { error: "Title is required." }

  const handle = slugify(String(formData.get("handle") ?? "") || title)
  if (!handle) return { error: "URL handle is required." }

  const category = String(formData.get("category") ?? "peptide")
  if (!["peptide", "equipment"].includes(category)) {
    return { error: "Invalid category." }
  }

  const status = String(formData.get("status") ?? "draft")
  if (!["draft", "published"].includes(status)) {
    return { error: "Invalid status." }
  }

  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => slugify(t))
    .filter(Boolean)

  const { error } = await supabase
    .from("products")
    .update({
      title,
      subtitle: String(formData.get("subtitle") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      handle,
      category,
      status,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)

  if (error) {
    if (error.code === "23505") {
      return { error: `The handle "${handle}" is already taken.` }
    }
    return { error: error.message }
  }

  revalidateCatalog(handle)
  return {}
}

export async function updateProductStatus(
  productId: string,
  status: "draft" | "published"
): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", productId)
  if (error) throw new Error(error.message)

  revalidateCatalog()
}

export async function deleteProduct(productId: string): Promise<Result> {
  await requireAdmin()

  // Orders reference variants with ON DELETE SET NULL and store their own
  // product_title, so order history survives the delete.
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId)

  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) return { error: error.message }

  const paths = (images ?? [])
    .map((i) => i.storage_path)
    .filter((p): p is string => Boolean(p))
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths)
  }

  revalidateCatalog()
  redirect("/admin/products")
}

// ─── Images ──────────────────────────────────────────────────────────────────

export async function uploadProductImages(
  productId: string,
  formData: FormData
): Promise<Result> {
  await requireAdmin()

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (!files.length) return { error: "Please choose at least one image." }

  for (const file of files) {
    if (!IMAGE_TYPES[file.type]) {
      return { error: `${file.name}: use a JPEG, PNG, WebP, or AVIF image.` }
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return { error: `${file.name} is larger than 5 MB.` }
    }
  }

  // Append after whatever is already in the gallery.
  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  let position = (last?.position ?? -1) + 1

  for (const file of files) {
    const ext = IMAGE_TYPES[file.type]
    const storagePath = `${productId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
        // Path is UUID-unique — a given object is never replaced, so it can be
        // cached indefinitely. Supabase defaults to one hour.
        cacheControl: "31536000",
      })
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      alt: file.name.replace(/\.[^.]+$/, ""),
      position: position++,
    })
    if (error) {
      // Don't leave an orphaned object behind if the row insert fails.
      await supabase.storage.from(BUCKET).remove([storagePath])
      return { error: error.message }
    }
  }

  revalidateCatalog()
  revalidatePath(`/admin/products/${productId}`)
  return {}
}

export async function deleteProductImage(imageId: string): Promise<Result> {
  await requireAdmin()

  const { data: image } = await supabase
    .from("product_images")
    .select("id,product_id,storage_path")
    .eq("id", imageId)
    .maybeSingle()
  if (!image) return { error: "Image not found." }

  const { error } = await supabase.from("product_images").delete().eq("id", imageId)
  if (error) return { error: error.message }

  // Legacy rows backfilled from products.thumbnail have no storage_path.
  if (image.storage_path) {
    await supabase.storage.from(BUCKET).remove([image.storage_path])
  }

  revalidateCatalog()
  revalidatePath(`/admin/products/${image.product_id}`)
  return {}
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[]
): Promise<Result> {
  await requireAdmin()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("product_images")
      .update({ position: i })
      .eq("id", orderedIds[i])
      .eq("product_id", productId)
    if (error) return { error: error.message }
  }

  revalidateCatalog()
  revalidatePath(`/admin/products/${productId}`)
  return {}
}

// ─── Variants ────────────────────────────────────────────────────────────────

export async function createVariant(
  productId: string,
  formData: FormData
): Promise<Result> {
  await requireAdmin()

  const title = String(formData.get("title") ?? "").trim()
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase()
  if (!title) return { error: "Variant name is required." }
  if (!sku) return { error: "SKU is required." }

  const price = Number(formData.get("price"))
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." }

  const quantity = Number(formData.get("inventory_quantity") ?? 0)
  const reorderPoint = Number(formData.get("reorder_point") ?? 10)

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      title,
      sku,
      price_cents: Math.round(price * 100),
      inventory_quantity: Math.max(0, Math.round(quantity)),
      reorder_point: Math.max(0, Math.round(reorderPoint)),
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { error: `SKU "${sku}" is already in use.` }
    return { error: error.message }
  }

  // Opening stock is an adjustment too, so history starts from a known point.
  if (quantity > 0) {
    await logAdjustment(data.id, Math.round(quantity), Math.round(quantity), "restock", "Opening stock")
  }

  revalidateCatalog()
  revalidatePath(`/admin/products/${productId}`)
  return {}
}

export async function updateVariant(
  variantId: string,
  data: {
    title?: string
    sku?: string
    price_cents?: number
    inventory_quantity?: number
    reorder_point?: number
  }
): Promise<Result> {
  await requireAdmin()

  const { data: current } = await supabase
    .from("product_variants")
    .select("id,product_id,inventory_quantity")
    .eq("id", variantId)
    .maybeSingle()
  if (!current) return { error: "Variant not found." }

  const updates: Record<string, string | number> = {}
  if (data.title?.trim()) updates.title = data.title.trim()
  if (data.sku?.trim()) updates.sku = data.sku.trim().toUpperCase()
  if (data.price_cents != null && data.price_cents >= 0) {
    updates.price_cents = Math.round(data.price_cents)
  }
  if (data.reorder_point != null && data.reorder_point >= 0) {
    updates.reorder_point = Math.round(data.reorder_point)
  }
  if (data.inventory_quantity != null && data.inventory_quantity >= 0) {
    updates.inventory_quantity = Math.round(data.inventory_quantity)
  }
  if (!Object.keys(updates).length) return {}

  const { error } = await supabase
    .from("product_variants")
    .update(updates)
    .eq("id", variantId)
  if (error) {
    if (error.code === "23505") return { error: "That SKU is already in use." }
    return { error: error.message }
  }

  // Setting the count directly still leaves a trail.
  if (
    updates.inventory_quantity != null &&
    updates.inventory_quantity !== current.inventory_quantity
  ) {
    const next = updates.inventory_quantity as number
    await logAdjustment(
      variantId,
      next - current.inventory_quantity,
      next,
      "correction",
      "Set directly from the inventory table"
    )
  }

  revalidateCatalog()
  revalidatePath(`/admin/products/${current.product_id}`)
  return {}
}

export async function deleteVariant(variantId: string): Promise<Result> {
  await requireAdmin()

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id,product_id")
    .eq("id", variantId)
    .maybeSingle()
  if (!variant) return { error: "Variant not found." }

  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", variant.product_id)
  if ((count ?? 0) <= 1) {
    return { error: "A product needs at least one variant. Unpublish it instead." }
  }

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
  if (error) return { error: error.message }

  revalidateCatalog()
  revalidatePath(`/admin/products/${variant.product_id}`)
  return {}
}

// ─── Inventory ───────────────────────────────────────────────────────────────

async function logAdjustment(
  variantId: string,
  delta: number,
  resultingQuantity: number,
  reason: string,
  note?: string | null
) {
  const user = await getUser()
  // History is a nice-to-have: never fail the stock change because the audit
  // row didn't write.
  await supabase
    .from("inventory_adjustments")
    .insert({
      variant_id: variantId,
      delta,
      resulting_quantity: resultingQuantity,
      reason,
      note: note || null,
      actor_email: user?.email ?? null,
    })
    .then(undefined, () => {})
}

export async function adjustInventory(
  variantId: string,
  formData: FormData
): Promise<Result> {
  await requireAdmin()

  const delta = Number(formData.get("delta"))
  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Enter a non-zero amount." }
  }

  const reason = String(formData.get("reason") ?? "manual")
  if (!["manual", "restock", "sale", "correction", "shrinkage"].includes(reason)) {
    return { error: "Invalid reason." }
  }

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id,product_id,inventory_quantity")
    .eq("id", variantId)
    .maybeSingle()
  if (!variant) return { error: "Variant not found." }

  const next = variant.inventory_quantity + Math.round(delta)
  if (next < 0) {
    return { error: `Only ${variant.inventory_quantity} in stock — can't remove that many.` }
  }

  const { error } = await supabase
    .from("product_variants")
    .update({ inventory_quantity: next })
    .eq("id", variantId)
  if (error) return { error: error.message }

  await logAdjustment(
    variantId,
    Math.round(delta),
    next,
    reason,
    String(formData.get("note") ?? "").trim() || null
  )

  revalidateCatalog()
  revalidatePath(`/admin/products/${variant.product_id}`)
  return {}
}
