import type { Metadata } from "next"
import { requireStaffOrRedirect } from "@/lib/admin"
import { getMfaState } from "@/lib/mfa"
import { MfaSetup } from "@/components/admin/mfa-setup"

export const metadata: Metadata = { title: "Security" }

// Factor state is per-session and must never be cached.
export const dynamic = "force-dynamic"

export default async function SecurityPage() {
  await requireStaffOrRedirect()
  const { enrolled, factorId, friendlyName } = await getMfaState()

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-sand-900">Security</h1>
        <p className="mt-1 text-sm text-sand-600">
          Two-factor authentication for your own admin account.
        </p>
      </header>

      <section className="rounded-2xl border border-sand-200 bg-white p-6">
        <MfaSetup
          enrolled={enrolled}
          factorId={factorId}
          friendlyName={friendlyName}
        />
      </section>
    </div>
  )
}
