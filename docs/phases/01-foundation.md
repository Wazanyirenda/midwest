# Phase 01 — Foundation

**Goal:** Both apps install, start, and connect to a real database. Nothing works yet beyond "the servers are running."

**Prerequisite:** None — this is first.

---

## Tasks

### 1.1 — Dependencies
- [ ] `pnpm install` completes without errors from the monorepo root
- [ ] No peer dependency errors that will cause runtime failures

### 1.2 — Database (Neon or Supabase)
- [ ] Create a free PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- [ ] Copy the connection string into `apps/backend/.env` as `DATABASE_URL`
- [ ] Generate random secrets:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
  Set `JWT_SECRET` and `COOKIE_SECRET` in `.env`

### 1.3 — Backend Migrations
- [ ] Run `pnpm db:migrate` from `apps/backend/`
- [ ] Migration completes without errors
- [ ] Create admin user:
  ```bash
  pnpm medusa user --email admin@midwesternpeptides.com --password yourpassword
  ```

### 1.4 — Backend Running
- [ ] `pnpm dev:backend` starts from monorepo root
- [ ] `http://localhost:9000/health` returns `{ "status": "ok" }`
- [ ] `http://localhost:9000/app` loads the Medusa admin login screen

### 1.5 — Storefront Running
- [ ] Copy `apps/storefront/.env.example` to `apps/storefront/.env.local`
- [ ] Get your publishable API key from the Medusa admin (`Settings → API Keys`)
- [ ] Set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `.env.local`
- [ ] `pnpm dev:storefront` starts from monorepo root
- [ ] `http://localhost:3000` loads the homepage

### 1.6 — Storefront connects to Backend
- [ ] Open browser console on `localhost:3000` — no CORS errors
- [ ] `STORE_CORS` in `apps/backend/.env` includes `http://localhost:3000`

---

## Verification Checklist

Before moving to Phase 02, all of the following must be true:

- [ ] `http://localhost:9000/health` → `{ "status": "ok" }`
- [ ] `http://localhost:9000/app` → Medusa admin loads
- [ ] `http://localhost:3000` → Storefront homepage loads
- [ ] No errors in either terminal
- [ ] No CORS errors in browser console

---

## Key Files
- `apps/backend/.env` — backend secrets (never commit this)
- `apps/backend/medusa-config.ts` — CORS, DB, Redis config
- `apps/storefront/.env.local` — storefront secrets (never commit this)

---

## Common Issues

**`DATABASE_URL` connection refused**
→ Check your Neon/Supabase connection string. Make sure SSL is enabled. Neon requires `?sslmode=require` at the end.

**CORS error on storefront**
→ `STORE_CORS` in `apps/backend/.env` must exactly match the origin including port: `http://localhost:3000`

**`pnpm install` out of memory**
→ Run with: `NODE_OPTIONS="--max-old-space-size=4096" pnpm install`

---

**Next:** [Phase 02 — Authentication](./02-auth.md)
