import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const email = user.emailAddresses[0]?.emailAddress ?? ""
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Researcher"

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <p className="mt-1 text-gray-500">
          Welcome back, <span className="font-medium text-gray-700">{name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Orders card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            View and track your research peptide orders.
          </p>
          <Link
            href="/account/orders"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View orders →
          </Link>
        </div>

        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="space-y-1 mb-4">
            <p className="text-sm text-gray-700">{name}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
          <p className="text-xs text-gray-400">
            Profile settings are managed via your account menu (top right).
          </p>
        </div>

        {/* Addresses card — placeholder for Phase 04 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
          </div>
          <p className="text-sm text-gray-500">
            Save shipping addresses for faster checkout.
          </p>
          <span className="mt-3 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            Coming soon
          </span>
        </div>

        {/* Support card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Support</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Questions about your order or our products?
          </p>
          <a
            href="mailto:support@midwesternpeptides.com"
            className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Contact support →
          </a>
        </div>
      </div>

      {/* Research disclaimer */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        <strong>Research Use Only:</strong> All products purchased through this
        account are for legitimate scientific research purposes only. Not for
        human consumption.
      </div>
    </main>
  )
}
