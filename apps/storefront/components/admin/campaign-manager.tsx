"use client"

import { useRef, useState, useTransition } from "react"
import { Send, Trash2, Plus } from "lucide-react"
import {
  createCampaign,
  deleteCampaign,
  sendCampaign,
} from "@/app/actions/admin-campaigns"

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

export function CampaignManager({
  campaigns,
  recipientCount,
  canSend,
}: {
  campaigns: Campaign[]
  recipientCount: number
  canSend: boolean
}) {
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function create(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createCampaign(formData)
      if (result?.error) return setError(result.error)
      formRef.current?.reset()
      setComposing(false)
    })
  }

  function send(id: string) {
    setError(null)
    setNotice(null)
    setConfirmId(null)
    startTransition(async () => {
      const result = await sendCampaign(id)
      if (result?.error) return setError(result.error)
      setNotice(`Sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`)
    })
  }

  function remove(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteCampaign(id)
      if (result?.error) setError(result.error)
    })
  }

  const field =
    "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 placeholder:text-sand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {notice}
        </p>
      )}

      {composing ? (
        <form
          ref={formRef}
          action={create}
          className="space-y-3 rounded-xl border border-sand-200 bg-white p-5"
        >
          <div>
            <label htmlFor="subject" className="mb-1.5 block text-xs font-medium text-sand-600">
              Subject
            </label>
            <input id="subject" name="subject" required className={field} />
          </div>
          <div>
            <label htmlFor="body" className="mb-1.5 block text-xs font-medium text-sand-600">
              Body
            </label>
            <textarea id="body" name="body" rows={8} required className={field} />
            <p className="mt-1 text-xs text-sand-600">
              Basic HTML is allowed. The layout, unsubscribe link, and postal
              address are added automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="rounded-lg px-3 py-2 text-sm text-sand-600 hover:text-sand-900"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} strokeWidth={2} />
          New campaign
        </button>
      )}

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-300 bg-white px-6 py-12 text-center text-sm text-sand-600">
          No campaigns yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-xl border border-sand-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sand-900">{c.subject}</p>
                  <p className="mt-0.5 text-xs text-sand-600">
                    {c.status === "sent"
                      ? `Sent to ${c.sent_count} of ${c.recipients} · ${
                          c.sent_at
                            ? new Date(c.sent_at).toLocaleDateString("en-US")
                            : ""
                        }`
                      : c.status === "sending"
                        ? "Sending…"
                        : `Draft · created ${new Date(c.created_at).toLocaleDateString("en-US")}`}
                  </p>
                </div>

                {c.status === "draft" && (
                  <div className="flex shrink-0 items-center gap-1">
                    {confirmId === c.id ? (
                      <>
                        <button
                          onClick={() => send(c.id)}
                          disabled={pending}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {pending ? "Sending…" : `Send to ${recipientCount}`}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1.5 text-xs text-sand-600 hover:text-sand-900"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmId(c.id)}
                          disabled={pending || !canSend || recipientCount === 0}
                          title={
                            !canSend
                              ? "Promotional email is off in Settings"
                              : recipientCount === 0
                                ? "Nobody has opted in yet"
                                : undefined
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 hover:border-brand-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send size={13} strokeWidth={2} />
                          Send
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          disabled={pending}
                          aria-label="Delete campaign"
                          className="rounded-lg p-1.5 text-sand-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {confirmId === c.id && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This sends immediately to {recipientCount} opted-in{" "}
                  {recipientCount === 1 ? "address" : "addresses"} and can&apos;t be
                  undone or recalled.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
