# Midwestern Peptides — Development Phases

Each phase must pass its **Verification Checklist** before the next phase begins.
Do not move forward if anything in the checklist is failing.

---

## Phase Map

| # | Phase | Status |
|---|-------|--------|
| [01](./01-foundation.md) | Foundation — Supabase project, schema, app running | ✅ Verified & complete |
| [02](./02-auth.md) | Authentication — Supabase Auth, Google OAuth, Roles, Sessions | ✅ Verified & complete |
| [03](./03-product-catalog.md) | Product Catalog — Seed, Listing, Detail Pages | ✅ Verified & complete |
| [04](./04-cart-checkout-ui.md) | Cart & Checkout UI — Cart State, Address, Multi-step Flow | ✅ Verified & complete |
| [05](./05-payments-stripe.md) | Payments (Fiat) — PaymentIntents, Signed Webhook, Idempotency | 🔄 Built — needs STRIPE_WEBHOOK_SECRET + account activation |
| [06](./06-payments-crypto.md) | Payments (Crypto) — NOWPayments, IPN Webhooks, Status UI | 🔲 Designed, not built |
| [07](./07-orders-email.md) | Orders & Email — Transports, Consent, Campaigns, Auth Mail | 🔄 Built — needs SMTP credentials |
| [08](./08-admin.md) | Admin Dashboard — /admin: Inventory, Orders, Low Stock | ✅ Verified & complete |
| [09](./09-security.md) | Security — Roles, Rate Limiting, Headers, Session Timeout | 🔄 Mostly complete — Sentry optional |
| [10](./10-seo-blog.md) | SEO & Blog — Sitemap, robots, Structured Data, Metadata | ✅ Verified & complete |
| [11](./11-production.md) | Production Deployment — Vercel, Cron, Launch Checklist | 🔄 Config ready — needs env vars in Vercel |

> **Status note (September 2026):** Phases 05 and 07 are code-complete and
> tested at the database level, but neither can function until credentials are
> set: `STRIPE_WEBHOOK_SECRET` for payments, `SMTP_*` for email. Until then no
> order is ever marked paid and no email is ever sent.

> **Architecture note (July 2026):** The Medusa backend was replaced with
> Supabase (Postgres + Storage) accessed directly from the Next.js app
> (`apps/storefront`). Schema lives in `supabase/migrations/`;
> `supabase/setup.sql` bootstraps a fresh project. `apps/backend` is retired
> and kept only for reference.

---

## Status Key
- 🔲 Not started
- 🔄 In progress
- ✅ Verified & complete
- ❌ Blocked

## Rule
Update the Status column in this file as you complete each phase.
