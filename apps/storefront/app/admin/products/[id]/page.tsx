import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { requireAdminOrRedirect } from "@/lib/admin"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { ProductForm } from "@/components/admin/product-form"
import { ImageManager } from "@/components/admin/image-manager"
import { VariantManager } from "@/components/admin/variant-manager"
import { DeleteProductButton } from "@/components/admin/delete-product-button"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Params) {
  await requireAdminOrRedirect()
  const { id } = await params

  const { data: product } = await supabase
    .from("products")
    .select(
      "id,title,subtitle,description,handle,category,status,tags," +
        "images:product_images(id,url,alt,position)," +
        "variants:product_variants(id,title,sku,price_cents,inventory_quantity,reorder_point)"
    )
    .eq("id", id)
    .maybeSingle()

  if (!product) notFound()

  type Loaded = {
    id: string
    title: string
    subtitle: string | null
    description: string | null
    handle: string
    category: string
    status: "draft" | "published"
    tags: string[] | null
    images: Array<{ id: string; url: string; alt: string | null; position: number }>
    variants: Array<{
      id: string
      title: string
      sku: string
      price_cents: number
      inventory_quantity: number
      reorder_point: number
    }>
  }
  const p = product as unknown as Loaded

  const images = [...p.images].sort((a, b) => a.position - b.position)
  const variants = [...p.variants].sort((a, b) => a.price_cents - b.price_cents)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-xs text-sand-500 hover:text-sand-800"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-sand-900">{p.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                p.status === "published"
                  ? "bg-brand-50 text-brand-800"
                  : "bg-sand-100 text-sand-600"
              }`}
            >
              {p.status === "published" ? "Published" : "Draft"}
            </span>
            {p.status === "published" && (
              <Link
                href={`/products/${p.handle}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sand-500 hover:text-brand-700"
              >
                View on store
                <ExternalLink size={11} strokeWidth={2} />
              </Link>
            )}
          </div>
        </div>
        <DeleteProductButton productId={p.id} title={p.title} />
      </div>

      <section className="rounded-xl border border-sand-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-sand-900">Images</h2>
        <ImageManager productId={p.id} images={images} />
      </section>

      <section className="rounded-xl border border-sand-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-sand-900">
          Variants &amp; pricing
        </h2>
        <VariantManager productId={p.id} variants={variants} />
      </section>

      <section className="rounded-xl border border-sand-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-sand-900">Details</h2>
        <ProductForm
          product={{
            id: p.id,
            title: p.title,
            subtitle: p.subtitle,
            description: p.description,
            handle: p.handle,
            category: p.category,
            status: p.status as "draft" | "published",
            tags: p.tags ?? [],
          }}
        />
      </section>
    </div>
  )
}
