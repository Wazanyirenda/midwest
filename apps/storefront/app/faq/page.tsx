import Link from "next/link"
import type { Metadata } from "next"
import { listFaqItems } from "@/lib/faq"

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about research use, certificates of analysis, purity, storage, and shipping.",
}

export const revalidate = 3600

export default async function FaqPage() {
  const items = await listFaqItems()

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <p className="font-mono text-2xs uppercase tracking-widest text-sand-600">
          Questions
        </p>
        <h1 className="mt-2 text-3xl font-bold text-sand-900 sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-sand-700">
          Everything below concerns laboratory research use. If your question
          isn&apos;t answered here,{" "}
          <a
            href="mailto:support@midwesternpeptides.com"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            email us
          </a>
          .
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-sand-200 bg-white p-8 text-center text-sm text-sand-700">
          No questions have been published yet.
        </p>
      ) : (
        <div className="divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white">
          {items.map((item) => (
            <details key={item.id} className="group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-sand-900 marker:content-none hover:text-brand-700">
                {item.question}
                <span
                  aria-hidden
                  className="shrink-0 text-lg font-normal text-sand-600 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-sand-700">
                {item.answer.split(/\n{2,}/).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-sand-200 bg-sand-50 p-6 text-center">
        <p className="text-sm text-sand-700">
          Before ordering, please read the{" "}
          <Link
            href="/disclaimer"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            research use disclaimer
          </Link>
          ,{" "}
          <Link
            href="/terms"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            terms of service
          </Link>
          , and{" "}
          <Link
            href="/shipping"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            shipping policy
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
