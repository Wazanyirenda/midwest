"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import { getSiteSettings } from "@/lib/settings"
import { sendCampaignEmail } from "@/lib/email"
import { transportStatus } from "@/lib/email-transport"

type Result = { error?: string; sent?: number }

/** Everyone with recorded marketing consent, plus their unsubscribe token. */
async function consentedRecipients(): Promise<
  Array<{ email: string; token?: string }>
> {
  const out = new Map<string, { email: string; token?: string }>()

  const { data: subs } = await supabase
    .from("newsletter_subscribers")
    .select("email,unsubscribe_token")
    .is("unsubscribed_at", null)
  for (const s of subs ?? []) {
    out.set(s.email.toLowerCase(), {
      email: s.email,
      token: s.unsubscribe_token as string,
    })
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,unsubscribe_token")
    .eq("marketing_email_opt_in", true)

  if (profiles?.length) {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email]))
    for (const p of profiles) {
      const email = emailById.get(p.id)
      if (!email) continue
      // Don't overwrite a newsletter token with a profile one; either works.
      if (!out.has(email.toLowerCase())) {
        out.set(email.toLowerCase(), {
          email,
          token: p.unsubscribe_token as string,
        })
      }
    }
  }

  return [...out.values()]
}

export async function createCampaign(formData: FormData): Promise<Result> {
  await requireAdmin()

  const subject = String(formData.get("subject") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()
  if (!subject) return { error: "Subject is required." }
  if (!body) return { error: "Body is required." }

  const user = await getUser()
  const { error } = await supabase.from("email_campaigns").insert({
    subject,
    body,
    status: "draft",
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath("/admin/campaigns")
  return {}
}

export async function deleteCampaign(campaignId: string): Promise<Result> {
  await requireAdmin()

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("status")
    .eq("id", campaignId)
    .maybeSingle()
  if (campaign?.status === "sent") {
    return { error: "A sent campaign can't be deleted — it's part of your send record." }
  }

  const { error } = await supabase
    .from("email_campaigns")
    .delete()
    .eq("id", campaignId)
  if (error) return { error: error.message }

  revalidatePath("/admin/campaigns")
  return {}
}

/**
 * Sends a draft campaign to every consented address.
 *
 * Deliberately not reversible and not resumable: status flips to 'sending'
 * first, so a crash leaves visible evidence rather than silently re-sending the
 * whole list on a retry.
 */
export async function sendCampaign(campaignId: string): Promise<Result> {
  await requireAdmin()

  const settings = await getSiteSettings()
  if (!settings.marketingEmails) {
    return { error: "Promotional email is turned off in Settings." }
  }
  if (!transportStatus().ready) {
    return { error: "No email transport is configured — nothing would actually send." }
  }
  // CAN-SPAM requires a real postal address in every promotional email.
  if (!settings.businessPostalAddress.trim()) {
    return {
      error:
        "Add your business postal address in Settings first — promotional email legally requires it.",
    }
  }

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("id,subject,body,status")
    .eq("id", campaignId)
    .maybeSingle()
  if (!campaign) return { error: "Campaign not found." }
  if (campaign.status !== "draft") {
    return { error: `This campaign is already ${campaign.status}.` }
  }

  const recipients = await consentedRecipients()
  if (recipients.length === 0) {
    return { error: "Nobody has opted in to marketing email yet." }
  }

  await supabase
    .from("email_campaigns")
    .update({ status: "sending", recipients: recipients.length })
    .eq("id", campaignId)

  let sent = 0
  for (const r of recipients) {
    // send() re-checks consent per address and logs the result, so a stale
    // recipient list can't mail someone who opted out mid-send.
    await sendCampaignEmail({
      email: r.email,
      campaignId: campaign.id,
      subject: campaign.subject,
      bodyHtml: campaign.body,
      unsubscribeToken: r.token,
    })
    sent++
  }

  await supabase
    .from("email_campaigns")
    .update({ status: "sent", sent_count: sent, sent_at: new Date().toISOString() })
    .eq("id", campaignId)

  revalidatePath("/admin/campaigns")
  return { sent }
}
