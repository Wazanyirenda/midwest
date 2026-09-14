"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { ShieldCheck, ShieldAlert } from "lucide-react"
import {
  enrollTotp,
  verifyTotpEnrollment,
  unenrollTotp,
  type EnrollResult,
} from "@/app/actions/mfa"

const codeCls =
  "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-center font-mono " +
  "text-lg tracking-[0.3em] text-sand-900 focus:border-brand-500 focus:outline-none " +
  "focus:ring-1 focus:ring-brand-500"

const btnCls =
  "rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"

type Enrolling = Extract<EnrollResult, { factorId: string }>

export function MfaSetup({
  enrolled,
  factorId,
  friendlyName,
}: {
  enrolled: boolean
  factorId: string | null
  friendlyName: string | null
}) {
  const [setup, setSetup] = useState<Enrolling | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function begin() {
    setError(null)
    start(async () => {
      const result = await enrollTotp()
      if ("error" in result) setError(result.error)
      else setSetup(result)
    })
  }

  function confirm() {
    if (!setup) return
    setError(null)
    start(async () => {
      const result = await verifyTotpEnrollment(setup.factorId, code)
      if (result.error) setError(result.error)
      else {
        setSetup(null)
        setCode("")
      }
    })
  }

  function remove() {
    if (!factorId) return
    setError(null)
    start(async () => {
      const result = await unenrollTotp(factorId, code)
      if (result.error) setError(result.error)
      else setCode("")
    })
  }

  if (enrolled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
          <ShieldCheck size={18} strokeWidth={2} />
          Two-factor authentication is on
          {friendlyName && <span className="font-normal text-sand-600">· {friendlyName}</span>}
        </p>
        <p className="max-w-prose text-sm text-sand-600">
          You&apos;ll be asked for a code from your authenticator app each time you
          sign in to the admin area. To remove it, enter a current code to confirm
          it&apos;s really you.
        </p>
        <div className="flex max-w-xs flex-col gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className={codeCls}
          />
          <button
            onClick={remove}
            disabled={pending}
            className="rounded-full border border-sand-300 px-5 py-2.5 text-sm font-medium text-sand-700 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-40"
          >
            {pending ? "Removing…" : "Turn off two-factor"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-sand-800">
          <ShieldAlert size={18} strokeWidth={2} className="text-amber-600" />
          Two-factor authentication is off
        </p>
        <p className="max-w-prose text-sm text-sand-600">
          Without it, anyone who gets your password or your Google account reaches
          every order, customer address and payout setting in the store.
        </p>
        <button onClick={begin} disabled={pending} className={btnCls}>
          {pending ? "Starting…" : "Set up two-factor"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ol className="max-w-prose list-decimal space-y-2 pl-5 text-sm text-sand-700">
        <li>Open an authenticator app — Google Authenticator, 1Password, Authy.</li>
        <li>Scan this code, or type the key in by hand.</li>
        <li>Enter the 6-digit code it shows to confirm.</li>
      </ol>

      <div className="flex flex-wrap items-start gap-6">
        {setup.qrDataUri && (
          <Image
            src={setup.qrDataUri}
            alt="Two-factor setup QR code"
            width={176}
            height={176}
            unoptimized
            className="rounded-xl border border-sand-200 bg-white p-2"
          />
        )}
        <div className="space-y-1.5">
          <p className="font-mono text-2xs uppercase tracking-widest text-sand-600">
            Or enter this key
          </p>
          <code className="block break-all rounded-lg bg-sand-100 px-3 py-2 font-mono text-sm text-sand-900">
            {setup.secret}
          </code>
        </div>
      </div>

      <div className="flex max-w-xs flex-col gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className={codeCls}
        />
        <button onClick={confirm} disabled={pending} className={btnCls}>
          {pending ? "Checking…" : "Confirm and turn on"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
