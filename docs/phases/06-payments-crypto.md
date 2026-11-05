# Phase 06 — Payments (Crypto / BTCPay Server)

**Goal:** Customers pay in Bitcoin (on-chain or Lightning) straight into the
store's own wallet. No processor holds the money, so no processor can freeze it
or close the account — the reason BTCPay replaced NOWPayments for a catalogue
that card and hosted crypto processors both treat as high-risk.

---

## How a payment flows

1. Checkout → customer clicks **Pay with Bitcoin**. The server re-prices the
   cart, creates a **pending** order, then a BTCPay invoice for exactly that
   total (`app/actions/checkout.ts` → `lib/btcpay.ts`).
2. The browser goes to BTCPay's checkout page (the link is checked to be on our
   own `BTCPAY_URL`). The price is locked for the invoice's lifetime.
3. The customer pays from any Bitcoin wallet. BTCPay watches the store wallet
   through its **xpub** (read-only), so funds land in that wallet directly.
4. BTCPay calls `/api/webhooks/btcpay`, signed with HMAC-SHA256 over the raw
   body. The route verifies it, then **reads the invoice back from BTCPay's
   API** and applies that — never the webhook body — via `lib/btcpay-sync.ts`.
5. On **Settled**: order marked paid, stock decremented, cart retired,
   confirmation email + PDF sent, receipt queued for the printer. Exactly once,
   through the `webhook_events` ledger in `process_payment_success`.

## When something goes wrong

| Situation | What happens |
|---|---|
| Customer loses connection after paying | Payment is on-chain; BTCPay sees it and the webhook completes the order |
| Invoice expires unpaid | Order stays pending, stock untouched; checkout can issue a fresh invoice |
| Underpaid, beyond the tolerance | Order held for review (`payment_review_reason`) and the owner is emailed |
| Customer pays an older invoice after re-starting checkout | Matched to its order through the invoice's metadata and counted |
| Paid twice (two invoices) | Order untouched; owner emailed to refund the extra |
| Our site down when the webhook fires | BTCPay retries; the success page asks BTCPay directly while it polls; `/api/cron/btcpay-reconcile` sweeps every pending crypto order from the last 7 days |

The tolerance is the **Underpayment tolerance** setting in `/admin/settings`,
passed to BTCPay as each invoice's `paymentTolerance`.

---

## Setup

### 1. A BTCPay server
Use a managed BTCPay host (no server to maintain) or a VPS. Because BTCPay is
given only an xpub, the host can see payments but cannot spend them.

### 2. A wallet that exports an xpub
In BTCPay: **Wallets → Bitcoin → Connect an existing wallet → Enter extended
public key**. Paste the wallet's xpub/zpub — never a seed phrase or private key.
Send a small test payment and confirm it appears in the wallet itself.

### 3. Store, API key, webhook
- **Store ID:** Store Settings → General.
- **API key:** Account → API Keys, limited to this store, with
  `btcpay.store.cancreateinvoice` and `btcpay.store.canviewinvoices` only.
- **Webhook:** Store Settings → Webhooks → `https://<your domain>/api/webhooks/btcpay`,
  events *Invoice settled* and *Invoice expired* at minimum (all events is fine).
  Copy the secret. Use **Send test webhook** — it should report success.

### 4. Environment (Vercel → Production, then redeploy)
```
BTCPAY_URL=https://your-btcpay-server   # no trailing slash
BTCPAY_STORE_ID=...
BTCPAY_API_KEY=...
BTCPAY_WEBHOOK_SECRET=...
```

### 5. Switch on
`/admin/settings` → **Crypto payments (BTCPay Server)**, and set
**Email me when something needs attention** so underpayments reach you.

---

## Verification checklist

- [ ] Test webhook from the BTCPay dashboard returns success
- [ ] Checkout shows **Pay with Bitcoin** only when enabled and configured
- [ ] A small real payment: success page turns into **Order confirmed**
- [ ] Order shows as paid in admin; confirmation email with PDF arrives
- [ ] Funds visible in the wallet itself
- [ ] An expired, unpaid invoice leaves the order pending and the cart intact
- [ ] No `BTCPAY_API_KEY` or `BTCPAY_WEBHOOK_SECRET` in any log

---

**Next:** [Phase 07 — Orders & Email](./07-orders-email.md)
