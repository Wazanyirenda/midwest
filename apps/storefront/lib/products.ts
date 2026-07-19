import { supabaseAdmin as supabase } from "./supabase/admin"

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
  tags: string[]
  variants: ProductVariant[]
}

const PRODUCT_FIELDS =
  "id,title,subtitle,description,handle,thumbnail,category,tags," +
  "variants:product_variants(id,title,sku,price_cents,inventory_quantity)"

// Marketing category slugs (products.tags) → display labels. The home strip,
// footer, and /products?category= filter all use these slugs.
export const CATEGORY_TAGS: Record<string, string> = {
  healing: "Healing Peptides",
  gh: "Growth Hormone",
  glp1: "GLP-1 Agonists",
  recovery: "Tissue Recovery",
  nootropic: "Nootropics",
  "anti-aging": "Anti-aging",
  coa: "COA Verified",
  new: "New Arrivals",
  supplies: "Lab Supplies",
}

export async function listProducts(
  filters: { q?: string; tag?: string } = {}
): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "published")
    .order("title")

  if (filters.q) query = query.ilike("title", `%${filters.q}%`)
  if (filters.tag) query = query.contains("tags", [filters.tag])

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
