import { SignUp } from "@clerk/nextjs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a Midwestern Peptides research account.",
  robots: { index: false, follow: false },
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track orders, save addresses, and check out faster.
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-md rounded-xl border border-gray-200",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            },
          }}
        />
        <p className="mt-4 text-center text-xs text-gray-400">
          By creating an account you confirm you are 21+ years of age and are
          purchasing for legitimate research purposes only.
        </p>
      </div>
    </main>
  )
}
