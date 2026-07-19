import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Choose a new password for your Midwestern Peptides account.",
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
          <p className="mt-1 text-sm text-gray-500">
            You followed a reset link — set your new password below.
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
