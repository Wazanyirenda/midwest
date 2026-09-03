import Link from "next/link"
import { requireAdminOrRedirect } from "@/lib/admin"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { getSiteSettings } from "@/lib/settings"
import { CampaignManager } from "@/components/admin/campaign-manager"

export const dynamic = "force-dynamic"

type Campaign = {
  id: string
  subject: string
  body: string
  status: string
  recipients: number
  sent_count: number
  created_at: string
  sent_at: string | null
}

export default async function AdminCampaignsPage() {
  await requireAdminOrRedirect()

  const [campaignsRes, settings, subsRes, optedInRes] = await Promise.all([
    supabase
      .from("email_campaigns")
      .select("id,subject,body,status,recipients,sent_count,created_at,sent_at")
      .order("created_at", { ascending: false }),
    getSiteSettings(),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("marketing_email_opt_in", true),
  ])

  const campaigns = (campaignsRes.data ?? []) as unknown as Campaign[]
  // Upper bound — send() re-checks each address, so the real figure can be lower
  // if someone appears on both lists or has opted out since.
  const recipientCount = (subsRes.count ?? 0) + (optedInRes.count ?? 0)

  const blockers: string[] = []
  if (!settings.marketingEmails) blockers.push("Promotional email is off in Settings")
  if (!settings.businessPostalAddress.trim())
    blockers.push("No business postal address set — required by CAN-SPAM")
  if (recipientCount === 0) blockers.push("Nobody has opted in yet")

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Campaigns</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          Promotional email to opted-in customers. Around {recipientCount}{" "}
          {recipientCount === 1 ? "address" : "addresses"} eligible.
        </p>
      </header>

      {blockers.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Sending is blocked until:
          </p>
          <ul className="mt-1.5 space-y-1">
            {blockers.map((b) => (
              <li key={b} className="text-xs text-amber-800">
                · {b}
              </li>
            ))}
          </ul>
          <Link
            href="/admin/settings"
            className="mt-2 inline-block text-xs font-medium text-amber-900 underline"
          >
            Open settings →
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-600">
        Keep campaigns to availability, restocks, and pricing. Health or efficacy
        claims about research compounds carry real regulatory risk.
      </div>

      <CampaignManager
        campaigns={campaigns}
        recipientCount={recipientCount}
        canSend={blockers.length === 0}
      />
    </div>
  )
}
