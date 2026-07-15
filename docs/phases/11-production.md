# Phase 11 — Production Deployment

**Goal:** The platform is live on a real domain with Vercel (storefront), a production server (backend), Cloudflare in front, and all environment variables set to production values.

**Prerequisite:** Phase 10 verified ✅

---

## Tasks

### 11.1 — Domain & DNS
- [ ] Purchase domain (e.g., `midwesternpeptides.com`)
- [ ] Add domain to Cloudflare (free plan minimum, Pro recommended)
- [ ] Point nameservers to Cloudflare

### 11.2 — Storefront → Vercel

- [ ] Create a Vercel account and link to your GitHub/GitLab repo
- [ ] Import the `apps/storefront` Next.js app
- [ ] Configure in Vercel:
  - **Root directory:** `apps/storefront`
  - **Build command:** `pnpm build`
  - **Install command:** `pnpm install --frozen-lockfile`
- [ ] Set all production environment variables in Vercel dashboard:
  ```
  NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.midwesternpeptides.com
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
  CLERK_SECRET_KEY=sk_live_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
  NEXT_PUBLIC_APP_URL=https://midwesternpeptides.com
  NEXT_PUBLIC_SENTRY_DSN=https://...
  ```
- [ ] Add custom domain in Vercel → `midwesternpeptides.com`
- [ ] Enable Vercel Analytics (free tier)
- [ ] Set spend limit in Vercel to avoid surprise bills

### 11.3 — Backend → Production Server
The Medusa backend is a Node.js server — it needs a persistent host (not Vercel serverless).

**Options (pick one):**
- **Railway** — easiest, ~$5/mo for hobby tier
- **Render** — similar to Railway
- **DigitalOcean App Platform** — $12/mo
- **VPS (Hetzner, DigitalOcean Droplet)** — most control, ~$6/mo

- [ ] Deploy Medusa backend to your chosen host
- [ ] Set all production environment variables on the host:
  ```
  DATABASE_URL=postgresql://...   # production Neon/Supabase URL
  REDIS_URL=rediss://...           # production Upstash URL
  JWT_SECRET=...                   # new random secret (generate fresh)
  COOKIE_SECRET=...                # new random secret
  STORE_CORS=https://midwesternpeptides.com
  ADMIN_CORS=https://admin.midwesternpeptides.com
  AUTH_CORS=https://midwesternpeptides.com,https://admin.midwesternpeptides.com
  MEDUSA_BACKEND_URL=https://api.midwesternpeptides.com
  STRIPE_API_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NOWPAYMENTS_API_KEY=...
  NOWPAYMENTS_IPN_SECRET=...
  RESEND_API_KEY=re_...
  SENTRY_DSN=https://...
  NODE_ENV=production
  ```
- [ ] Run production migrations: `pnpm db:migrate`
- [ ] Configure backend URL as `api.midwesternpeptides.com` in Cloudflare

### 11.4 — Cloudflare Configuration

**DNS:**
- [ ] `midwesternpeptides.com` → Vercel (CNAME, proxied ✅)
- [ ] `api.midwesternpeptides.com` → backend host (CNAME, proxied ✅)
- [ ] `admin.midwesternpeptides.com` → backend host (CNAME — consider NOT proxying admin, or restrict via Cloudflare Access)

**Security:**
- [ ] Enable **WAF** (Web Application Firewall) — Pro plan
- [ ] Enable **Bot Fight Mode**
- [ ] Enable **DDoS Protection** (automatic on all plans)
- [ ] Set **SSL/TLS mode** to "Full (strict)"
- [ ] Enable **HSTS** in Cloudflare Edge Certificates settings
- [ ] Add a rate limiting rule for `/api/*` and `/hooks/*` as a backup to application-level limits

**Firewall Rules:**
- [ ] Block requests with no User-Agent
- [ ] Block known bad bots
- [ ] Consider geo-blocking if you don't ship internationally yet

### 11.5 — Production Stripe Webhook
- [ ] In Stripe dashboard → Webhooks → Add endpoint: `https://api.midwesternpeptides.com/hooks/payment/stripe`
- [ ] Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] Copy the new webhook signing secret → update `STRIPE_WEBHOOK_SECRET` in production

### 11.6 — Production NOWPayments IPN
- [ ] In NOWPayments dashboard → set IPN URL: `https://api.midwesternpeptides.com/hooks/payment/nowpayments`

### 11.7 — Pre-Launch Checklist
- [ ] Run [PageSpeed Insights](https://pagespeed.web.dev/) on homepage and a product page → score > 85 on mobile
- [ ] Run [securityheaders.com](https://securityheaders.com) on production domain → grade A or B minimum
- [ ] Test a real purchase end-to-end (Stripe live mode with a real card — charge $1 test)
- [ ] Test crypto payment end-to-end in live mode
- [ ] Confirm order confirmation email arrives
- [ ] Confirm admin receives order notification
- [ ] Test all legal pages: Privacy Policy, Terms of Service, Shipping Policy
- [ ] Confirm "Research Use Only" disclaimer is present on every product page and at checkout
- [ ] Age verification gate is active at checkout
- [ ] Sentry is receiving events from production

### 11.8 — Post-Launch
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up uptime monitoring (free: [uptimerobot.com](https://uptimerobot.com))
- [ ] Document your incident response plan (even a simple one)

---

## Verification Checklist

- [ ] `https://midwesternpeptides.com` loads with HTTPS and no mixed content warnings
- [ ] `https://api.midwesternpeptides.com/health` → `{ "status": "ok" }`
- [ ] Complete purchase with live Stripe card → order confirmed, email received
- [ ] Complete purchase with crypto → order confirmed after payment
- [ ] All security headers present on production domain
- [ ] Cloudflare WAF is active (check Cloudflare dashboard → Security → Events)
- [ ] Google Search Console shows sitemap submitted and indexed
- [ ] Sentry alerts are configured and receiving events
- [ ] No `.env` files committed to git (run: `git log --all --full-history -- "*.env"`)

---

## Key Files
- `apps/storefront/next.config.ts` — production config
- `apps/backend/medusa-config.ts` — production settings
- `apps/storefront/public/.well-known/security.txt`

---

🎉 **Launch complete.** Monitor Sentry and Cloudflare for the first 48 hours after launch.
