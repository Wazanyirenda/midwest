import { requireAdminOrRedirect } from "@/lib/admin"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProductForm } from "@/components/admin/product-form"

export default async function NewProductPage() {
  await requireAdminOrRedirect()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-xs text-sand-500 hover:text-sand-800"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Products
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-sand-900">New product</h1>
        <p className="mt-0.5 text-sm text-sand-500">
          Saves as a draft — you&apos;ll add images and variants next, then publish.
        </p>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-5">
        <ProductForm />
      </div>
    </div>
  )
}
