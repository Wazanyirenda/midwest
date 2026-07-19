import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Midwestern Peptides account password.",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
