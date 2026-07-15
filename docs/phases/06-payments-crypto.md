# Phase 06 — Payments (Crypto / NOWPayments)

**Goal:** Customers can pay with cryptocurrency (USDT, USDC, BTC, ETH, etc.). IPN webhooks are verified with HMAC-SHA512. Payment status is shown in real time.

**Prerequisite:** Phase 05 verified ✅

---

## Tasks

### 6.1 — NOWPayments Account & Keys
- [ ] Create an account at [nowpayments.io](https://nowpayments.io)
- [ ] Get your API key from the dashboard
- [ ] Set up an IPN (webhook) secret in the dashboard
- [ ] Add to `apps/backend/.env`:
  ```
  NOWPAYMENTS_API_KEY=...
  NOWPAYMENTS_IPN_SECRET=...
  ```

### 6.2 — Register NOWPayments Provider in Medusa Config
- [ ] Update `apps/backend/medusa-config.ts` to add NOWPayments to the payment module:
  ```ts
  {
    resolve: "./src/modules/nowpayments",
    id: "nowpayments",
    options: {
      apiKey: process.env.NOWPAYMENTS_API_KEY,
      ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
      sandbox: process.env.NODE_ENV !== "production",
    },
  }
  ```
  The provider service is already built at `apps/backend/src/modules/nowpayments/service.ts`

### 6.3 — Enable NOWPayments in Medusa Admin
- [ ] In Medusa admin → **Settings → Regions → United States**
- [ ] Add NOWPayments as a payment provider
- [ ] Save

### 6.4 — Crypto Payment UI in Checkout
- [ ] When customer selects "Pay with Crypto" in Step 3:
  - Call a Server Action that creates a NOWPayments invoice via Medusa
  - Display the returned invoice URL as a button ("Open Payment Page") or embed as iframe/QR
  - Show which coins are accepted (USDT, USDC preferred — stablecoins first)
  - Explain the pending confirmation process clearly

- [ ] Show the payment status states clearly:
  - **Waiting** — invoice created, waiting for payment
  - **Confirming** — transaction detected, waiting for confirmations
  - **Confirmed** — payment confirmed, order being processed
  - **Expired** — invoice expired, offer to create a new one

### 6.5 — Payment Status Polling
- [ ] After invoice is created, poll the Medusa cart's payment session status every 15 seconds
- [ ] When status changes to `authorized` → redirect to order confirmation page
- [ ] Show a progress indicator while waiting

### 6.6 — IPN Webhook Handler
The webhook verification is already implemented in `service.ts` using HMAC-SHA512.

- [ ] Confirm NOWPayments IPN URL is configured in the NOWPayments dashboard:
  `https://yourdomain.com/hooks/payment/nowpayments`
- [ ] For local testing, use a tunnel tool (ngrok or Cloudflare Tunnel) to expose `localhost:9000`
- [ ] Test IPN delivery in the NOWPayments sandbox

### 6.7 — Refund Policy Notice
- [ ] Add a notice in the crypto payment step:
  > "Crypto payments are non-refundable due to the nature of blockchain transactions. 
  > If there is an issue with your order, please contact support for resolution."

---

## Verification Checklist

- [ ] "Pay with Crypto" option appears in checkout
- [ ] Selecting crypto → NOWPayments invoice is created
- [ ] Invoice URL / QR code is displayed to the customer
- [ ] Accepted coins list is shown (stablecoins first)
- [ ] Payment status polling works (test with sandbox)
- [ ] IPN webhook arrives, signature is verified (check backend logs)
- [ ] After IPN confirms payment → order is created in Medusa admin
- [ ] Order confirmation page loads after crypto payment
- [ ] Expired invoice → user can generate a new one
- [ ] No `NOWPAYMENTS_API_KEY` or `NOWPAYMENTS_IPN_SECRET` visible in any logs

---

## Key Files
- `apps/backend/src/modules/nowpayments/service.ts` — payment provider (already built)
- `apps/backend/src/modules/nowpayments/index.ts` — module registration (already built)
- `apps/backend/medusa-config.ts` — register the provider
- `apps/storefront/app/(store)/checkout/page.tsx` — crypto payment UI step

---

## Security Notes
- IPN webhook signature verification (HMAC-SHA512) is implemented in `service.ts` — do not bypass it
- Never fulfill an order based on client-side state alone — always wait for the IPN webhook to confirm server-side
- Log payment events (invoice ID, status changes) but never log the IPN secret or API key

---

**Next:** [Phase 07 — Orders & Email](./07-orders-email.md)
