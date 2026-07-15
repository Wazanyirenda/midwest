import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getProductByHandle } from "@/lib/products"
import { formatPrice } from "@/lib/utils"
import { AddToCartButton } from "@/components/store/add-to-cart-button"

type Props = {
  params: Promise<{ handle: string }>
}

async function getProduct(handle: string) {
  return getProductByHandle(handle)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Product Not Found" }

  return {
    title: product.title,
    description: `${product.description?.slice(0, 155) ?? "Research peptide for scientific investigation."}.`,
    openGraph: {
      title: `${product.title} | Midwestern Peptides`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export const revalidate = 3600

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) notFound()

  const variants = product.variants ?? []
  const firstVariant = variants[0]
  const firstVariantId = firstVariant?.id ?? ""

  const prices = variants.map((v) => ({
    id: v.id,
    title: v.title,
    price: { amount: v.price_cents },
  }))

  const lowestPrice = prices
    .map((v) => v.price.amount)
    .sort((a, b) => a - b)[0]

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square w-full rounded-3xl bg-[#F0F5F0] border border-sand-200 overflow-hidden flex items-center justify-center">
          {product.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnail}
              alt={product.title ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-mono text-6xl font-bold text-brand-200 select-none">
              {product.title?.slice(0, 3).toUpperCase()}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-sand-400 uppercase mb-2">
              Research peptide
            </p>
            <h1 className="text-3xl font-bold text-sand-900">{product.title}</h1>
            {lowestPrice != null && (
              <p className="mt-3 text-2xl font-semibold text-brand-600">
                From {formatPrice(lowestPrice)}
              </p>
            )}
          </div>

          {/* Variant selector */}
          {variants.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-sand-700 mb-3">
                Select size / concentration
              </label>
              <div className="flex flex-wrap gap-2">
                {prices.map((v) => (
                  <button
                    key={v.id}
                    className="rounded-full border border-sand-300 px-4 py-2 text-sm
                      hover:border-brand-500 hover:text-brand-700 transition-colors
                      first:border-brand-500 first:text-brand-700 first:bg-brand-50"
                  >
                    {v.title}
                    {v.price?.amount != null && (
                      <span className="ml-1 text-sand-400">
                        — {formatPrice(v.price.amount)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm max-w-none text-sand-600">
              <p>{product.description}</p>
            </div>
          )}

          {/* COA / Batch info */}
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-5 text-sm space-y-2.5">
            {[
              { label: "Purity",                  value: "≥ 98% (HPLC verified)" },
              { label: "Certificate of Analysis", value: "Available on request", link: true },
              { label: "Batch / Lot",             value: "See product label", muted: true },
              { label: "Form",                    value: "Lyophilized powder" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="font-medium text-sand-700">{row.label}</span>
                <span className={row.link ? "text-brand-600 cursor-pointer hover:underline" : row.muted ? "text-sand-400 italic" : "text-sand-600"}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Add to cart */}
          {firstVariantId ? (
            <AddToCartButton variantId={firstVariantId} />
          ) : (
            <button
              disabled
              className="w-full rounded-full bg-sand-200 px-6 py-3.5 text-base font-semibold text-sand-400 cursor-not-allowed"
            >
              Out of Stock
            </button>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 text-xs text-sand-500">
            {[
              "🔬 Third-party tested",
              "🔒 Secure checkout",
              "📦 Discreet shipping",
              "💳 Crypto accepted",
            ].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-sand-200 bg-sand-50 px-3 py-1 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Full disclaimer */}
      <div className="mt-16 rounded-2xl border border-sand-200 bg-sand-50 p-6 text-xs text-sand-500 leading-relaxed">
        <strong className="block text-sand-600 mb-1">Important Disclaimer</strong>
        This product is sold exclusively for laboratory research and scientific
        investigation by qualified researchers. It is not intended for human or
        animal consumption, medical treatment, veterinary use, or any application
        outside of controlled research settings. These statements have not been
        evaluated by the FDA. Midwestern Peptides makes no therapeutic or medical claims.
      </div>
    </main>
  )
}
