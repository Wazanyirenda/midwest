import { SignIn } from "@clerk/nextjs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Midwestern Peptides research account.",
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to view your orders and manage your account.
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-md rounded-xl border border-gray-200",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            },
          }}
        />
      </div>
    </main>
  )
}
