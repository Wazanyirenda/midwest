import { requireUser, getProfile } from "@/lib/auth"
import { AccountNav } from "@/components/account/account-nav"

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already protects /account; this covers direct rendering paths.
  const user = await requireUser("/account")
  const profile = await getProfile(user.id)

  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Researcher"
  const initials =
    [profile?.first_name?.[0], profile?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || (user.email?.[0] ?? "?").toUpperCase()

  return (
    <div className="min-h-[70vh] bg-sand-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="lg:w-56 lg:shrink-0">
            {/* Identity card */}
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-sand-200 bg-white p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sand-200 bg-brand-50 text-sm font-semibold text-brand-800">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className="truncate text-xs text-sand-500">{user.email}</p>
              </div>
            </div>

            <AccountNav />
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
