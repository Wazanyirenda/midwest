# Phase 05 — Payments (Stripe / Fiat)

**Goal:** Customers can pay with a credit or debit card via Stripe. Orders are created in Medusa after successful payment. Webhook signature verification is enforced.

**Prerequisite:** Phase 04 verified ✅

---

## Tasks

### 5.1 — Stripe Account & Keys
- [ ] Create / log in to [stripe.com](https://stripe.com)
- [ ] Get test mode API keys from the Stripe dashboard
- [ ] Add to `apps/backend/.env`:
  ```
  STRIPE_API_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...  ← get this in step 5.3
  ```
- [ ] The Stripe payment provider is already registered in `apps/backend/medusa-config.ts`

### 5.2 — Enable Stripe in Medusa Admin
- [ ] In Medusa admin → **Settings → Regions → United States**
- [ ] Click "Add Payment Provider" → select Stripe
- [ ] Save

### 5.3 — Stripe Webhook
- [ ] Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
- [ ] For local development, forward webhooks:
  ```bash
  stripe listen --forward-to localhost:9000/hooks/payment/stripe
  ```
- [ ] Copy the webhook signing secret printed by the CLI → set `STRIPE_WEBHOOK_SECRET`
- [ ] For production: add webhook endpoint in Stripe dashboard pointing to `https://yourdomain.com/hooks/payment/stripe`

### 5.4 — Payment Step in Checkout
- [ ] Update checkout Step 3 to render a Stripe card element when "Credit/Debit Card" is selected
- [ ] Use `@stripe/stripe-js` and `@stripe/react-stripe-js` in the storefront:
  ```bash
  pnpm add @stripe/stripe-js @stripe/react-stripe-js --filter storefront
  ```
- [ ] Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` to `apps/storefront/.env.local`
- [ ] Create a Server Action that:
  1. Calls Medusa to select the Stripe payment provider on the cart
  2. Returns the Stripe `client_secret` from the payment session
- [ ] Stripe `<CardElement>` collects card details client-side (no card data touches your server)
- [ ] On submit: confirm payment with Stripe JS, then complete the cart in Medusa

### 5.5 — Order Confirmation Page
- [ ] After successful payment, Medusa returns an order ID
- [ ] Redirect to `/orders/[orderId]/confirmed`
- [ ] Show: order number, items, shipping address, total paid
- [ ] Show "Research Use Only" reminder

### 5.6 — Test the Full Flow
Use Stripe test cards:
- `4242 4242 4242 4242` — success
- `4000 0000 0000 0002` — card declined
- `4000 0025 0000 3155` — requires 3D Secure

---

## Verification Checklist

- [ ] Stripe payment option appears in checkout Step 3
- [ ] Card element renders correctly (no CSP errors blocking Stripe iframe)
- [ ] Test card `4242 4242 4242 4242` → payment succeeds
- [ ] Order appears in Medusa admin after successful payment
- [ ] Order confirmation page loads with correct order details
- [ ] Declined card `4000 0000 0000 0002` → shows error, does not create order
- [ ] Stripe webhook arrives at backend and is verified (check backend logs)
- [ ] No card data in your server logs (only Stripe token references)

---

## Key Files
- `apps/backend/medusa-config.ts` — Stripe provider registration
- `apps/backend/.env` — `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
- `apps/storefront/app/(store)/checkout/page.tsx` — payment step
- `apps/storefront/.env.local` — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Security Notes
- Never log `STRIPE_API_KEY` or `STRIPE_WEBHOOK_SECRET`
- Always verify webhook signatures — Medusa's Stripe provider does this automatically
- Never pass raw card numbers through your server — Stripe JS tokenizes client-side

---

**Next:** [Phase 06 — Payments (Crypto)](./06-payments-crypto.md)
