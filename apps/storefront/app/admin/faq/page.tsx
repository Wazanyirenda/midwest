import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { requireAdminOrRedirect } from "@/lib/admin"
import { listAllFaqItems } from "@/lib/faq"
import { FaqManager } from "@/components/admin/faq-manager"

export const dynamic = "force-dynamic"

export default async function AdminFaqPage() {
  await requireAdminOrRedirect()

  const items = await listAllFaqItems()
  const published = items.filter((i) => i.published).length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-sand-900">FAQ</h1>
          <p className="mt-0.5 text-sm text-sand-600">
            {published} of {items.length} entries visible on the public page.
            Hidden entries stay saved but don&apos;t render.
          </p>
        </div>
        <Link
          href="/faq"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          View page
          <ExternalLink size={14} strokeWidth={2} />
        </Link>
      </header>

      <FaqManager items={items} />
    </div>
  )
}
