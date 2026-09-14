import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { MfaChallenge } from "@/components/admin/mfa-challenge"
import { getMfaState } from "@/lib/mfa"

export const metadata: Metadata = {
  title: "Two-factor verification",
  robots: { index: false, follow: false },
}

// Lives outside /admin so the admin layout's own gate cannot redirect to itself.
export const dynamic = "force-dynamic"

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next: rawNext } = await searchParams
  // Same-origin relative paths only — this one comes from the query string.
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin"

  const { enrolled, needsChallenge } = await getMfaState()
  if (!enrolled) redirect("/admin")
  if (!needsChallenge) redirect(next)

  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-sand-900">Two-factor verification</h1>
          <p className="mt-1 text-sm text-sand-600">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
        <div className="rounded-2xl border border-sand-200 bg-white p-6">
          <MfaChallenge next={next} />
        </div>
      </div>
    </main>
  )
}
