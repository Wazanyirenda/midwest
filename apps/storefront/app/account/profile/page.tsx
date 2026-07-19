import type { Metadata } from "next"
import { requireUser, getProfile } from "@/lib/auth"
import { ProfileForm } from "@/components/account/profile-form"
import { AvatarUploader } from "@/components/account/avatar-uploader"
import { ChangeEmailForm } from "@/components/account/change-email-form"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { CommunicationPrefs } from "@/components/account/communication-prefs"

export const metadata: Metadata = {
  title: "Profile & Settings",
  robots: { index: false, follow: false },
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default async function ProfilePage() {
  const user = await requireUser("/account/profile")
  const profile = await getProfile(user.id)

  const initial = (profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="mt-1 text-gray-500">Manage how you appear and sign in.</p>
      </div>

      <Section title="Profile photo">
        <AvatarUploader avatarUrl={profile?.avatar_url ?? null} initial={initial} />
      </Section>

      <Section title="Personal information">
        <ProfileForm
          defaults={{
            first_name: profile?.first_name ?? "",
            last_name: profile?.last_name ?? "",
            phone: profile?.phone ?? "",
          }}
        />
      </Section>

      <Section
        title="Email address"
        description="Changing your email requires confirming links sent to both your current and new address."
      >
        <ChangeEmailForm currentEmail={user.email ?? ""} />
      </Section>

      <Section title="Password">
        <ChangePasswordForm />
      </Section>

      <Section title="Communication preferences">
        <CommunicationPrefs optedIn={profile?.marketing_email_opt_in ?? false} />
      </Section>
    </main>
  )
}
