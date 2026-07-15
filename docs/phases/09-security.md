# Phase 09 — Security & Rate Limiting

**Goal:** The platform is hardened against abuse. Rate limiting protects sensitive endpoints. Monitoring catches errors in real time. Security headers are verified.

**Prerequisite:** Phase 08 verified ✅

---

## Tasks

### 9.1 — Upstash Redis Setup
- [ ] Create a free Redis database at [upstash.com](https://upstash.com)
- [ ] Add connection URL to `apps/backend/.env`:
  ```
  REDIS_URL=rediss://...
  ```
- [ ] Confirm backend connects to Redis on startup (check logs)

### 9.2 — Rate Limiting on Backend Routes
- [ ] Install rate limiting middleware:
  ```bash
  pnpm add @upstash/ratelimit @upstash/redis --filter backend
  ```
- [ ] Apply rate limits (requests per minute per IP) to:
  - `/auth/token` (login) — 5 req/min
  - `/store/carts/*/complete` (checkout) — 3 req/min
  - `/store/customers` (registration) — 5 req/min
  - All `/hooks/payment/*` webhook endpoints — 30 req/min
- [ ] Return `429 Too Many Requests` with a `Retry-After` header

### 9.3 — Verify Security Headers
Security headers are already set in `apps/storefront/next.config.ts`.

- [ ] Use [securityheaders.com](https://securityheaders.com) to scan your deployed URL
- [ ] Confirm these headers are present:
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Content-Security-Policy`
  - `Permissions-Policy`
- [ ] Adjust CSP if Clerk or NOWPayments iframes are being blocked (check browser console)

### 9.4 — Sentry Setup
- [ ] Create a free account at [sentry.io](https://sentry.io)
- [ ] Create two projects: one for Next.js (storefront), one for Node.js (backend)
- [ ] Install Sentry in the storefront:
  ```bash
  pnpm add @sentry/nextjs --filter storefront
  npx @sentry/wizard@latest -i nextjs --filter storefront
  ```
- [ ] Install Sentry in the backend:
  ```bash
  pnpm add @sentry/node --filter backend
  ```
- [ ] Add DSN keys to env files:
  ```
  SENTRY_DSN=https://...   # backend .env
  NEXT_PUBLIC_SENTRY_DSN=https://...  # storefront .env.local
  ```
- [ ] Confirm errors appear in the Sentry dashboard
- [ ] Set up alerts for: high error rate, payment failures, 500 errors

### 9.5 — Structured Logging Audit
- [ ] Search backend logs for any accidental PII logging:
  ```bash
  grep -r "email" apps/backend/src --include="*.ts" | grep "log\|console"
  grep -r "address" apps/backend/src --include="*.ts" | grep "log\|console"
  ```
- [ ] Remove any log statements that print customer emails, addresses, or payment data
- [ ] Confirm `STRIPE_API_KEY`, `NOWPAYMENTS_API_KEY`, and secrets are never logged

### 9.6 — Dependency Audit
- [ ] Run from monorepo root:
  ```bash
  pnpm audit
  ```
- [ ] Fix any high or critical severity vulnerabilities
- [ ] Consider setting up [socket.dev](https://socket.dev) for continuous supply chain monitoring

### 9.7 — `security.txt`
- [ ] Create `apps/storefront/public/.well-known/security.txt`:
  ```
  Contact: mailto:security@midwesternpeptides.com
  Expires: 2027-01-01T00:00:00.000Z
  Preferred-Languages: en
  ```

---

## Verification Checklist

- [ ] Redis is connected and rate limiting is active (test by hitting login endpoint 6x rapidly → 429 returned)
- [ ] All security headers present (verified via securityheaders.com or curl)
- [ ] Sentry receives a test error from both the backend and storefront
- [ ] No PII in logs confirmed by grep audit
- [ ] `pnpm audit` shows no critical vulnerabilities
- [ ] `/.well-known/security.txt` is publicly accessible

---

## Key Files
- `apps/storefront/next.config.ts` — security headers
- `apps/backend/medusa-config.ts` — Redis URL
- `apps/storefront/public/.well-known/security.txt`

---

**Next:** [Phase 10 — SEO & Blog](./10-seo-blog.md)
