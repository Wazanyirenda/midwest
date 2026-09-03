# Phase 11 — Production Deployment

**Goal:** The store is live on Vercel, taking real payments, sending real email,
and nothing in the launch path is guessed.

---

## 11.1 — Environment variables in Vercel

Set for **Production** (and Preview where noted). Everything here lives in
`apps/storefront/.env.example` with placeholders.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **never** prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | yes | drives sitemap, email links, `return_url` |
| `STRIPE_SECRET_KEY` | yes | `sk_live_` in production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes | `pk_live_` in production |
| `STRIPE_WEBHOOK_SECRET` | yes | **from the dashboard endpoint, not `stripe listen`** |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | yes | Porkbun: `smtp.porkbun.com`, 587, mailbox password |
| `EMAIL_FROM` | yes | must match an address on the sending domain |
| `SEND_EMAIL_HOOK_SECRET` | yes | branded auth mail; else Supabase sends generic templates |
| `CRON_SECRET` | yes | abandoned-cart job refuses to run without it |
| `ADMIN_EMAILS` | no | emergency bootstrap only; roles live in the database |
| `ADMIN_IP_ALLOWLIST` | no | extra restriction on `/admin` |
| `RESEND_API_KEY` | no | only if sending campaigns via Resend |
| `NEXT_PUBLIC_SENTRY_DSN` | no | error reporting |

- [ ] All required variables set for Production
- [ ] No secret carries a `NEXT_PUBLIC_` prefix
- [ ] `NEXT_PUBLIC_APP_URL` is the real domain, not a `*.vercel.app` preview

## 11.2 — Stripe

- [ ] Stripe account onboarding complete (`charges_enabled: true`)
- [ ] Webhook endpoint added: `https://<domain>/api/webhooks/stripe`
- [ ] Events: `payment_intent.succeeded`, `payment_intent.payment_failed`,
      `charge.refunded`, `charge.dispute.created`
- [ ] Live-mode `whsec_` copied into Vercel
- [ ] A real card completes checkout and the order reaches `paid`
- [ ] A 3DS card (`4000 0027 6000 3184`) also completes

## 11.3 — Email

- [ ] `/admin/settings` → Email → **Send test email** succeeds
- [ ] SPF and DKIM records added in Porkbun DNS for the sending domain
- [ ] A test order produces a confirmation email
- [ ] Supabase → Authentication → Hooks → Send Email points at
      `https://<domain>/api/auth/send-email`
- [ ] Password reset arrives branded, and the link works

## 11.4 — Cron

`apps/storefront/vercel.json` schedules the abandoned-cart job hourly. Vercel
reads `vercel.json` from the **project root directory** — if the Vercel project's
root is the repo rather than `apps/storefront`, move the file accordingly.

- [ ] Cron appears in the Vercel dashboard after deploy
- [ ] `CRON_SECRET` set (Vercel injects it as a Bearer token automatically)
- [ ] A manual run returns `{ considered, sent, skipped }` rather than 401

## 11.5 — Database

- [ ] All migrations in `supabase/migrations/` applied to the production project
- [ ] `supabase_migrations.schema_migrations` matches the files on disk
- [ ] RLS enabled on every table; no anon policy on `orders`, `email_log`,
      `webhook_events`, `rate_limits`, `inventory_adjustments`
- [ ] No `SECURITY DEFINER` function is callable by `anon`

## 11.6 — Launch checks

- [ ] `/sitemap.xml` and `/robots.txt` return correctly for the live domain
- [ ] `robots.txt` on a **preview** deploy disallows everything
- [ ] `/admin` redirects a signed-out visitor and a non-admin account
- [ ] Product page passes Google's Rich Results test
- [ ] Sign out, then confirm a claimed cart is no longer visible
- [ ] Idle for 10 minutes → signed out

---

## Notes
- Preview deployments share the production database. Treat any preview as
  capable of writing real data until a separate project exists.
- `NEXT_PUBLIC_APP_URL` is used to build email links; if it is wrong, customers
  get links to the wrong host and password resets fail silently.

---

**Previous:** [Phase 10 — SEO & Blog](./10-seo-blog.md)
