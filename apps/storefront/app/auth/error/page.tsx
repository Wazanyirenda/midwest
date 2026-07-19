import Link from "next/link"
import type { Metadata } from "next"
import { TimerOff } from "lucide-react"

export const metadata: Metadata = {
  title: "Link expired — Midwestern Peptides",
  robots: { index: false },
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-md">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400">
          <TimerOff size={22} strokeWidth={1.5} />
        </span>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          This link is invalid or has expired
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Email links only work once and expire after a short time. Request a
          new one and try again.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Back to sign in
          </Link>
          <Link
            href="/forgot-password"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Request a new password reset
          </Link>
        </div>
      </div>
    </div>
  )
}
