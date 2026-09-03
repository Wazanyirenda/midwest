import Link from "next/link"
import type { Metadata } from "next"
import { FlaskConical } from "lucide-react"
import { getSiteSettings } from "@/lib/settings"

export const metadata: Metadata = {
  title: "Research Use Disclaimer",
  description:
    "All products are sold strictly for laboratory research use. Not for human or veterinary use.",
}

export const revalidate = 3600

export default async function DisclaimerPage() {
  const { disclaimerBody } = await getSiteSettings()
  const paragraphs = disclaimerBody.split(/\n{2,}/).filter(Boolean)

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-1 font-mono text-2xs uppercase tracking-widest text-sand-700">
          <FlaskConical size={12} strokeWidth={2} className="text-brand-700" />
          Notice
        </span>
        <h1 className="mt-4 text-3xl font-bold text-sand-900 sm:text-4xl">
          Strictly for research use.
        </h1>
        <p className="mt-3 text-sm text-sand-700">
          For laboratory research use only — please read before you order.
        </p>
      </header>

      <div className="rounded-2xl border border-sand-200 bg-white p-6 sm:p-9">
        <div className="space-y-4 text-sm leading-relaxed text-sand-700">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className={i === 0 ? "font-medium text-sand-900" : undefined}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-sand-700">
        See also our{" "}
        <Link
          href="/terms"
          className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          terms of service
        </Link>{" "}
        and{" "}
        <Link
          href="/faq"
          className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          frequently asked questions
        </Link>
        .
      </p>
    </main>
  )
}
