"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Trash2, Upload } from "lucide-react"
import {
  deleteProductImage,
  reorderProductImages,
  uploadProductImages,
} from "@/app/actions/admin-products"

type Image = {
  id: string
  url: string
  alt: string | null
  position: number
}

export function ImageManager({
  productId,
  images: initial,
}: {
  productId: string
  images: Image[]
}) {
  const [images, setImages] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function upload(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    const formData = new FormData()
    for (const file of Array.from(files)) formData.append("images", file)

    startTransition(async () => {
      const result = await uploadProductImages(productId, formData)
      if (result?.error) setError(result.error)
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  function remove(id: string) {
    setError(null)
    // Optimistic: the server revalidates and re-renders with the truth.
    setImages((prev) => prev.filter((i) => i.id !== id))
    startTransition(async () => {
      const result = await deleteProductImage(id)
      if (result?.error) setError(result.error)
    })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= images.length) return

    const a = images[index]
    const b = images[target]
    if (!a || !b) return

    const next = [...images]
    next[index] = b
    next[target] = a
    setImages(next)
    setError(null)

    startTransition(async () => {
      const result = await reorderProductImages(
        productId,
        next.map((i) => i.id)
      )
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-sand-200 bg-sand-50"
            >
              <div className="relative aspect-square">
                <Image
                  src={image.url}
                  alt={image.alt ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                  className="object-cover"
                />
              </div>

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Primary
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/75 px-1.5 py-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    aria-label="Move image earlier"
                    className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowLeft size={13} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1 || pending}
                    aria-label="Move image later"
                    className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <ArrowRight size={13} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(image.id)}
                  disabled={pending}
                  aria-label="Delete image"
                  className="rounded p-1 text-white hover:bg-red-500/80 disabled:opacity-30"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          upload(e.dataTransfer.files)
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-sand-300 bg-sand-50 px-4 py-7 text-center transition-colors hover:border-brand-500 hover:bg-brand-50"
      >
        <Upload size={18} strokeWidth={1.75} className="text-sand-500" />
        <span className="text-sm font-medium text-sand-700">
          {pending ? "Uploading…" : "Drop images here, or click to browse"}
        </span>
        <span className="text-xs text-sand-400">
          JPEG, PNG, WebP, or AVIF · up to 5 MB each
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={pending}
          onChange={(e) => upload(e.target.files)}
          className="sr-only"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-xs text-sand-400">
        The first image is the product thumbnail shown across the storefront.
      </p>
    </div>
  )
}
