"use client"

import { useActionState } from "react"
import { createProduct, updateProduct } from "@/app/actions/admin-products"

type Product = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  handle: string
  category: string
  status: "draft" | "published"
  tags: string[]
}

const field =
  "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
const label = "block text-xs font-medium text-sand-600 mb-1.5"

export function ProductForm({ product }: { product?: Product }) {
  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => action(formData),
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className={label}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={product?.title}
            placeholder="BPC-157"
            className={field}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="subtitle" className={label}>
            Subtitle
          </label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={product?.subtitle ?? ""}
            placeholder="Body Protection Compound · 5mg"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="handle" className={label}>
            URL handle
          </label>
          <input
            id="handle"
            name="handle"
            defaultValue={product?.handle}
            placeholder="bpc-157"
            className={`${field} font-mono`}
          />
          <p className="mt-1 text-xs text-sand-400">
            Leave blank to generate from the title.
          </p>
        </div>

        <div>
          <label htmlFor="category" className={label}>
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={product?.category ?? "peptide"}
            className={field}
          >
            <option value="peptide">Peptide</option>
            <option value="equipment">Equipment</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tags" className={label}>
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={product?.tags?.join(", ") ?? ""}
            placeholder="healing, recovery, coa"
            className={field}
          />
          <p className="mt-1 text-xs text-sand-400">
            Comma-separated. Drives the category filters on the storefront —
            healing, gh, glp1, recovery, nootropic, anti-aging, coa, new, supplies.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className={label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={product?.description ?? ""}
            className={field}
          />
        </div>

        {product && (
          <div>
            <label htmlFor="status" className={label}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={product.status}
              className={field}
            >
              <option value="draft">Draft — hidden from the store</option>
              <option value="published">Published — live</option>
            </select>
          </div>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  )
}
