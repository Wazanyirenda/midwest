import Link from "next/link"
import type { Metadata } from "next"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

type Props = {
  searchParams: Promise<{ token?: string; email?: string }>
}

/**
 * One-click unsubscribe — no sign-in, by design. Gmail and Yahoo bulk-sender
 * rules require a single click to work, and the token makes that safe without
 * authenticating anyone.
 *
 * Runs on GET, which normally shouldn't mutate. That's a deliberate exception:
 * mail clients follow the link directly, and an extra confirmation step is
 * exactly what the one-click rule forbids.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, email } = await searchParams

  let ok = false
  let address: string | null = null

  if (token) {
    // Try the newsletter list first, then account preferences.
    const { data: sub } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id,email")
      .eq("unsubscribe_token", token)
      .maybeSingle()

    if (sub) {
      await supabaseAdmin
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", sub.id)
      ok = true
      address = sub.email
    } else {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("unsubscribe_token", token)
        .maybeSingle()

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            marketing_email_opt_in: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)
        ok = true
      }
    }
  } else if (email) {
    // Fallback for older mail without a token. Only ever suppresses, so the
    // worst a guessed address achieves is opting someone out.
    const { data } = await supabaseAdmin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email.toLowerCase())
      .select("email")
      .maybeSingle()
    if (data) {
      ok = true
      address = data.email
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <div
        className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
          ok ? "bg-brand-100" : "bg-sand-100"
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-8 w-8 text-brand-600" strokeWidth={2} />
        ) : (
          <AlertCircle className="h-8 w-8 text-sand-600" strokeWidth={2} />
        )}
      </div>

      <h1 className="text-2xl font-bold text-sand-900">
        {ok ? "You're unsubscribed" : "Link not recognised"}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sand-600">
        {ok ? (
          <>
            {address ? (
              <>
                <span className="font-medium">{address}</span> won&apos;t receive
                marketing email from us again.
              </>
            ) : (
              "You won't receive marketing email from us again."
            )}{" "}
            Order confirmations and shipping updates still come through — those
            aren&apos;t promotional.
          </>
        ) : (
          "This unsubscribe link is invalid or has already been used. If you're still getting email you don't want, reply to any message and we'll remove you."
        )}
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-sand-300 px-6 py-3 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50"
      >
        Back to the store
      </Link>
    </main>
  )
}
