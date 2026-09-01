"use client"

import { useRef, useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/app/actions/admin-products"

type Variant = {
  id: string
  title: string
  sku: string
  price_cents: number
  inventory_quantity: number
  reorder_point: number
}

const cell =
  "w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm text-sand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

function VariantRow({
  variant,
  canDelete,
  onError,
}: {
  variant: Variant
  canDelete: boolean
  onError: (message: string | null) => void
}) {
  const [form, setForm] = useState({
    title: variant.title,
    sku: variant.sku,
    price: (variant.price_cents / 100).toFixed(2),
    stock: String(variant.inventory_quantity),
    reorder: String(variant.reorder_point),
  })
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const dirty =
    form.title !== variant.title ||
    form.sku !== variant.sku ||
    Number(form.price) !== variant.price_cents / 100 ||
    Number(form.stock) !== variant.inventory_quantity ||
    Number(form.reorder) !== variant.reorder_point

  const lowStock = Number(form.stock) <= Number(form.reorder)

  function save() {
    onError(null)
    startTransition(async () => {
      const result = await updateVariant(variant.id, {
        title: form.title,
        sku: form.sku,
        price_cents: Math.round(Number(form.price) * 100),
        inventory_quantity: Number(form.stock),
        reorder_point: Number(form.reorder),
      })
      if (result?.error) {
        onError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function remove() {
    onError(null)
    startTransition(async () => {
      const result = await deleteVariant(variant.id)
      if (result?.error) onError(result.error)
    })
  }

  return (
    <tr className="align-top">
      <td className="py-2 pr-2">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          aria-label="Variant name"
          className={cell}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          aria-label="SKU"
          className={`${cell} font-mono text-xs`}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          aria-label="Price in dollars"
          className={`${cell} tabular-nums`}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="1"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          aria-label="Quantity in stock"
          className={`${cell} tabular-nums ${
            lowStock ? "border-amber-400 bg-amber-50" : ""
          }`}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="1"
          value={form.reorder}
          onChange={(e) => setForm({ ...form, reorder: e.target.value })}
          aria-label="Reorder point"
          className={`${cell} tabular-nums`}
        />
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "…" : saved ? "Saved" : "Save"}
          </button>
          {canDelete && (
            <button
              onClick={remove}
              disabled={pending}
              aria-label={`Delete variant ${variant.title}`}
              className="rounded-md p-1.5 text-sand-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function VariantManager({
  productId,
  variants,
}: {
  productId: string
  variants: Variant[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function add(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createVariant(productId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      setAdding(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-sand-500">
            <tr>
              <th className="pb-1.5 pr-2 font-medium">Variant</th>
              <th className="pb-1.5 pr-2 font-medium">SKU</th>
              <th className="pb-1.5 pr-2 font-medium">Price</th>
              <th className="pb-1.5 pr-2 font-medium">In stock</th>
              <th className="pb-1.5 pr-2 font-medium">Reorder at</th>
              <th className="pb-1.5" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <VariantRow
                key={v.id}
                variant={v}
                canDelete={variants.length > 1}
                onError={setError}
              />
            ))}
          </tbody>
        </table>
      </div>

      {variants.length === 0 && !adding && (
        <p className="text-sm text-sand-500">
          This product has no variants yet — customers can&apos;t buy it until you add
          one.
        </p>
      )}

      {adding ? (
        <form
          ref={formRef}
          action={add}
          className="grid gap-2 rounded-lg border border-sand-200 bg-sand-50 p-3 sm:grid-cols-6"
        >
          <input name="title" required placeholder="5mg" aria-label="Variant name" className={cell} />
          <input
            name="sku"
            required
            placeholder="BPC-5MG"
            aria-label="SKU"
            className={`${cell} font-mono text-xs`}
          />
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Price"
            aria-label="Price in dollars"
            className={cell}
          />
          <input
            name="inventory_quantity"
            type="number"
            min="0"
            defaultValue={0}
            aria-label="Opening stock"
            className={cell}
          />
          <input
            name="reorder_point"
            type="number"
            min="0"
            defaultValue={10}
            aria-label="Reorder point"
            className={cell}
          />
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-2 py-1.5 text-xs text-sand-500 hover:text-sand-800"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 transition-colors hover:border-brand-500 hover:text-brand-700"
        >
          <Plus size={14} strokeWidth={2} />
          Add variant
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
