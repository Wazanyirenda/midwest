# Midwestern Peptides — Development Phases

Each phase must pass its **Verification Checklist** before the next phase begins.
Do not move forward if anything in the checklist is failing.

---

## Phase Map

| # | Phase | Status |
|---|-------|--------|
| [01](./01-foundation.md) | Foundation — Supabase project, schema, app running | ✅ Verified & complete |
| [02](./02-auth.md) | Authentication — Clerk, Protected Routes, Account Page | 🔄 In progress |
| [03](./03-product-catalog.md) | Product Catalog — Seed, Listing, Detail Pages | ✅ Verified & complete |
| [04](./04-cart-checkout-ui.md) | Cart & Checkout UI — Cart State, Address, Multi-step Flow | 🔄 In progress |
| [05](./05-payments-stripe.md) | Payments (Fiat) — Stripe PaymentIntents, Webhooks | 🔄 In progress (needs Stripe keys) |
| [06](./06-payments-crypto.md) | Payments (Crypto) — NOWPayments, IPN Webhooks, Status UI | 🔲 Not started |
| [07](./07-orders-email.md) | Orders & Email — Order History, Resend Email Notifications | 🔲 Not started |
| [08](./08-admin.md) | Admin Dashboard — /admin: Inventory, Orders, Low Stock | ✅ Verified & complete |
| [09](./09-security.md) | Security & Rate Limiting — Redis, Sentry, Cloudflare WAF | 🔲 Not started |
| [10](./10-seo-blog.md) | SEO & Blog — MDX Content, Metadata, Sitemap, Schema | 🔲 Not started |
| [11](./11-production.md) | Production Deployment — Vercel, Launch Checklist | 🔄 In progress |

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
