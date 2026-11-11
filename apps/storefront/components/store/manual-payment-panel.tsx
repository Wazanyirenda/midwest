"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react"
import { refreshBtcQuote, submitPaymentProof } from "@/app/actions/manual-payments"
import { assetLabel, formatCryptoAmount, networkLabel } from "@/lib/crypto-assets"
import type { ManualPayment } from "@/lib/orders"

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (old browser, insecure context): the value is on
      // screen to select by hand, so there is nothing more to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sand-300 bg-white px-2.5 py-1.5 text-xs font-medium text-sand-700 transition-colors hover:bg-sand-50"
    >
      {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function Row({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string
  value: string
  copyValue?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-sand-600">{label}</span>
      <span className={`min-w-0 flex-1 break-all text-sm font-semibold text-sand-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
      {copyValue && <CopyButton value={copyValue} label={label.toLowerCase()} />}
    </div>
  )
}

export function ManualPaymentPanel({
  orderId,
  orderCode,
  payment,
  quoteExpired,
  quoteMinutes,
  cancelHours,
}: {
  orderId: string
  orderCode: string
  payment: ManualPayment
  quoteExpired: boolean
  quoteMinutes: number
  cancelHours: number
}) {
  const router = useRouter()
  const [txid, setTxid] = useState(payment.txid ?? "")
  const [editing, setEditing] = useState(!payment.txid)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const amount = formatCryptoAmount(payment.amount, payment.asset)
  const network = networkLabel(payment.network)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitPaymentProof(orderId, txid)
      if (result.error) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  function refresh() {
    setError(null)
    startTransition(async () => {
      const result = await refreshBtcQuote(orderId)
      if (result.error) setError(result.error)
      router.refresh()
    })
  }

  if (payment.submittedAt && !editing) {
    return (
      <section className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-base font-semibold text-blue-900">Payment submitted. We&apos;re checking it.</h2>
        <p className="mt-1 text-sm text-blue-800">
          We check every payment by hand, usually within a few hours. You&apos;ll get an email as soon as
          your order is approved, and another when it ships.
        </p>
        <div className="mt-4 rounded-lg bg-white/70 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-sand-600">Your transaction ID</p>
          <p className="mt-1 break-all font-mono text-sand-900">{payment.txid}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-sm font-medium text-blue-800 underline underline-offset-2"
        >
          Pasted the wrong one? Change it
        </button>
      </section>
    )
  }

  return (
    <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
      <h2 className="text-base font-semibold text-sand-900">Complete your payment</h2>
      <p className="mt-1 text-sm text-sand-700">
        Send exactly the amount below from your own wallet, then paste the transaction ID underneath. Unpaid
        orders are canceled after {cancelHours} hours.
      </p>

      {quoteExpired ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white p-4 text-sm text-sand-800">
          <p className="font-medium">The Bitcoin price for this order has expired.</p>
          <p className="mt-1 text-sand-600">
            Bitcoin&apos;s price moves, so amounts are held for {quoteMinutes} minutes. Get an updated amount
            before you pay.
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <RefreshCw size={14} strokeWidth={2} className={pending ? "animate-spin" : ""} />
            Get updated amount
          </button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-sand-200 rounded-lg border border-sand-200 bg-white px-4">
          <Row label="Send exactly" value={`${amount} ${payment.asset}`} copyValue={amount} />
          <Row label="Coin" value={assetLabel(payment.asset)} />
          <Row label="Network" value={network} />
          <Row label="To address" value={payment.address} copyValue={payment.address} mono />
          <Row label="Order" value={orderCode} copyValue={orderCode} mono />
        </div>
      )}

      <p className="mt-3 flex gap-2 text-xs text-amber-800">
        <AlertTriangle size={14} strokeWidth={2} className="mt-px shrink-0" />
        <span>
          Send only <strong>{payment.asset}</strong> on the <strong>{network}</strong> network. Coins sent on
          another network, or to a different address, can&apos;t be recovered.
          {payment.asset === "BTC" &&
            ` This amount is held for ${quoteMinutes} minutes from when it was shown.`}
        </span>
      </p>

      <form onSubmit={submit} className="mt-5 border-t border-amber-200 pt-5">
        <label htmlFor="txid" className="block text-sm font-semibold text-sand-900">
          I&apos;ve paid. Here&apos;s my transaction ID
        </label>
        <p className="mt-0.5 text-xs text-sand-600">
          {payment.asset === "BTC"
            ? "Bitcoin payments can't carry a note, so this is how we match your payment to your order."
            : "This is how we match your payment to your order."}{" "}
          Find it in your wallet&apos;s transaction details. It&apos;s sometimes called the transaction hash
          or TXID.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="txid"
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            maxLength={200}
            autoComplete="off"
            spellCheck={false}
            placeholder={payment.network === "bitcoin" ? "e.g. 4a5e1e4baab89f3a32…" : "e.g. 0x9f2c…"}
            className="min-w-0 flex-1 rounded-lg border border-sand-300 bg-white px-3 py-2.5 font-mono text-sm text-sand-900 placeholder:text-sand-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={pending || txid.trim() === ""}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit payment"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
