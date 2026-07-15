import { supabase } from "./supabase"

export type ProductVariant = {
  id: string
  title: string
  sku: string
  price_cents: number
  inventory_quantity: number
}

export type Product = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  handle: string
  thumbnail: string | null
  category: "peptide" | "equipment"
  variants: ProductVariant[]
}

const PRODUCT_FIELDS =
  "id,title,subtitle,description,handle,thumbnail,category," +
  "variants:product_variants(id,title,sku,price_cents,inventory_quantity)"

export async function listProducts(q?: string): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "published")
    .order("title")

  if (q) query = query.ilike("title", `%${q}%`)

  const { data, error } = await query
  if (error) {
    console.error("listProducts:", error.message)
    return []
  }
  return (data ?? []) as unknown as Product[]
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "published")
    .eq("handle", handle)
    .maybeSingle()

  if (error) {
    console.error("getProductByHandle:", error.message)
    return null
  }
  return data as unknown as Product | null
}

export function lowestVariantPrice(product: Product): number | null {
  if (!product.variants.length) return null
  return Math.min(...product.variants.map((v) => v.price_cents))
}
