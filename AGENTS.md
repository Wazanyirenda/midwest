# Agent Instructions — Midwestern Peptides

**Read this file in full before writing or changing any code in this repo. Every
task, every time.** It is not background reading — it is the contract. If a
request conflicts with a rule here, say so before you build; don't silently
break the rule.

This is a live e-commerce store handling real customer accounts, addresses, and
card payments. A bug here is a leaked order, a free product, or a stolen
session — not a broken build. Treat every change as production.

---

## 0. Before you touch anything

1. Read the files you are about to change, plus the ones they import from.
   Never guess an API, a column name, or a helper's signature.
2. Follow the patterns already in the file. This codebase has consistent
   conventions (below) — match them rather than introducing your own.
3. Ask the **Toggle Test** (§2). Most "add a feature" requests are really
   "add a setting".
4. When done, run the **Checklist** (§7).

---

## 1. The stack and where things live

| Area | Path | Notes |
|---|---|---|
| Storefront app | `apps/storefront` | Next.js 15 App Router, React 19, TS, Tailwind |
| Server actions | `apps/storefront/app/actions/*.ts` | All mutations. `"use server"` |
| Server-only libs | `apps/storefront/lib/*.ts` | Start with `import "server-only"` |
| Supabase clients | `apps/storefront/lib/supabase/` | `admin.ts` (service role), `server.ts` (session), `middleware.ts` |
| Auth / roles | `lib/auth.ts`, `lib/admin.ts` | `getUser`, `requireUser`, `requireAdmin`, `requireStaff` |
| Site settings | `lib/settings.ts` | Owner-controlled toggles |
| Admin area | `app/admin/**` | Staff + admin only |
| Webhooks | `app/api/webhooks/**` | Signature-verified, excluded from middleware |
| DB migrations | `supabase/migrations/` | `YYYYMMDDNNNNNN_name.sql`, sequence increments globally |
| Phase docs | `docs/phases/` | Build plan and acceptance criteria |

Data access happens on the server. There is no public API surface for the
storefront beyond webhooks and auth callbacks — keep it that way.

---

## 2. Build it as an admin toggle, not a hardcoded decision

**This is the rule this project cares about most.**

The owner must be able to change how the store looks and behaves from
`/admin/settings` without a code change, a rebuild, or a deploy. Anything you
hardcode becomes a support request the owner cannot solve alone.

### The Toggle Test

Before hardcoding any value or `if`, ask: *would the store owner ever reasonably
want this different, without wanting to call a developer?*

If yes → it is a setting. If it is a fact about how the system works (a hash
algorithm, a signature check, a foreign key), it is code.

**Make it a setting:**
- Showing/hiding UI: badges, banners, sections, promos, payment logos
- Copy the owner might reword: announcements, notices, shipping blurbs
- Which payment methods are offered (Apple Pay, Amazon Pay, crypto)
- Merchandising behaviour: hide out-of-stock, sort order, featured counts
- Thresholds the business owns: free-shipping minimum, low-stock warning level,
  order limits, cart maximums
- Anything a competitor's Shopify admin would let you switch off

**Keep it in code (never a setting):**
- Authentication, authorization, and role checks
- RLS policies, signature verification, idempotency
- Rate limits and other abuse controls
- Anything where "off" means "insecure"

Never add an env var for something the owner should control — env vars need a
redeploy. Env vars are for secrets and per-environment wiring only.

### How to add a setting (follow exactly)

1. **Migration** — insert the key with a conservative default:
   ```sql
   insert into site_settings (key, value) values
     ('free_shipping_threshold_cents', '10000'::jsonb)
   on conflict (key) do nothing;
   ```
   Key/value, so a new setting is an insert — not a schema change.
2. **`lib/settings.ts`** — add the field to `SiteSettings`, a default to
   `DEFAULT_SETTINGS`, and the DB key to `SETTING_KEYS`. The default must match
   the seeded row and must be the safe choice: if the settings table is
   unreachable, the storefront still renders correctly and promises nothing it
   can't deliver.
3. **`app/admin/settings/page.tsx`** — add a `SettingToggle` (or a text field
   like `AnnouncementField`) in the right `Section`, with a label and a
   description written for the owner, not for a developer.
4. **Consume it** via `await getSiteSettings()` in a server component. It is
   deduped per request by `cache()` — call it where you need it, don't thread it
   through props across the whole tree.
5. **Validation** lives in `app/actions/admin-settings.ts` — the incoming
   value's type must match the default's, and strings are length-capped. Extend
   that validation if your setting needs a range or an enum.

Never read `site_settings` directly from a component, and never write it from
anywhere but `admin-settings.ts` under `requireAdmin()`.

---

## 3. Security rules — non-negotiable

AI-written platforms get breached because authorization is assumed instead of
checked, and client input is trusted. Both are banned here.

### Authorization
- **Check authorization inside every server action and route handler**, not just
  in `middleware.ts`. The middleware admin gate is a coarse UX filter — it is
  documented as such. The authoritative check is `requireAdmin()` /
  `requireStaff()` / `requireUser()` at the top of the mutation itself.
- Use `getUser()` (`lib/auth.ts`) — it validates the JWT against the auth
  server. **Never** use `getSession()` for an authorization decision; its
  contents come from a cookie the client controls.
- Staff ≠ admin. Roles, settings, products, and payouts are admin-only. Orders
  and inventory are staff-reachable. Pick the narrower one when unsure.
- Never let a user change their own role, and never allow demoting the last
  admin (see `admin-roles.ts`) — lockouts are unrecoverable without a redeploy.

### Data access
- `supabaseAdmin` uses the **service-role key and bypasses RLS entirely.** Every
  user-scoped query through it **must** filter by the authenticated user's id
  explicitly:
  ```ts
  const user = await requireUser()
  await supabaseAdmin.from("orders").select("*").eq("user_id", user.id)
  ```
  Forgetting `.eq("user_id", …)` is the single most likely way to leak this
  store's data. Re-read every query you write for it.
- **IDOR:** never fetch by a client-supplied id alone. `.eq("id", orderId)` must
  be paired with `.eq("user_id", user.id)` (or an admin check). Same for
  addresses, carts, wishlists, invoices.
- Every new table gets `enable row level security` in the same migration, plus
  explicit policies. Public read only where the data is genuinely public
  (settings that drive public pages, published products). Writes stay
  service-role.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, the Stripe secret, or the Resend key
  to the client. Only `NEXT_PUBLIC_*` reaches the browser — if you are about to
  prefix a secret with `NEXT_PUBLIC_`, stop.
- Server-only modules start with `import "server-only"`. Keep it.

### Input
- Validate and narrow **everything** that crosses the boundary: form data,
  action arguments, search params, route params, webhook bodies. Use `zod`
  (already a dependency) for anything with shape; explicit type/range checks for
  scalars.
- **Never trust client-supplied money, quantities, or product state.** Prices,
  totals, shipping, and discounts are recomputed on the server from the database
  at the moment of checkout. The client sends *what* they want, never *what it
  costs*.
- Clamp quantities and cap string lengths before they reach the database.
- Treat `next=` and other redirect params as hostile: allow only same-origin
  relative paths starting with a single `/`. Never redirect to an arbitrary URL.

### Payments and webhooks
- Verify the provider signature over the **raw request body** before parsing
  (see the Stripe route). Never `await request.json()` first.
- Webhook handlers are **idempotent** — replays and retries must not double-fulfil
  an order. Go through the existing event-id / `process_payment_success` path.
- Return 400 for an unverifiable request (a retry can't fix it), 500 only for
  genuine server or config faults.
- Never mark an order paid from client code or from a success-page visit. Only a
  verified webhook or a server-side provider lookup may change payment state.

### Output and sessions
- No `dangerouslySetInnerHTML` with anything user- or CMS-supplied. Markdown
  goes through `react-markdown` without raw-HTML plugins.
- Error messages returned to users stay generic. Raw Postgres errors, stack
  traces, ids, and emails belong in `console.error`, not in the UI.
- Never log secrets, tokens, card data, or customer PII.
- Auth cookies stay `httpOnly`, `sameSite: "lax"`, `secure` in production.
  Signing out must clear every `sb-*` cookie plus `cart_id` — a claimed cart
  must not outlive the session on a shared browser.
- Rate-limit anything that sends email, creates accounts, or attempts payment,
  and anything guessable by brute force (wishlist tokens, invoice links).

### When you are unsure
Choose the restrictive option and say so in your summary. "Locked down, tell me
if you want it opened up" is always the right default here.

---

## 4. Code quality

- **TypeScript strict.** No `any` — if you truly need an escape hatch, scope it
  to one line with an `eslint-disable-next-line` and a comment saying why (see
  `lib/settings.ts` for the accepted form).
- **Server by default.** Add `"use client"` only for components that need state,
  effects, or event handlers. Never make a page a client component to solve a
  data-fetching problem; fetch on the server and pass data down.
- **Server actions return `{ error?: string }`** rather than throwing at the
  user. Redirect or revalidate on success; return a readable message on failure.
- **`revalidatePath`** whatever the mutation actually affects — including
  `revalidatePath("/", "layout")` for anything in the storefront shell.
- **Small, surgical diffs.** Change what was asked. Don't reformat, rename, or
  "improve" untouched code in the same pass.
- **Reuse before you write.** Check `lib/` first — there is probably already a
  helper for products, orders, cart, shipping, or settings.
- **Comments explain *why*, never *what*.** Match the existing voice: short,
  factual, pointing at the reason a non-obvious choice was made. Delete a
  comment when the code it explains goes away.
- **No dead code**, no commented-out blocks, no unused exports, no leftover
  `console.log`. `console.error` / `console.warn` for genuine faults is fine.
- **Naming:** camelCase in TS, snake_case in SQL. The DB key is the stable name;
  the TS field is the convenience name (see `SETTING_KEYS`).
- **Migrations are append-only.** Never edit a migration that has already run —
  write a new one. Name it `YYYYMMDDNNNNNN_description.sql`, continuing the
  global sequence. Every migration must be safe to re-run (`if not exists`,
  `on conflict do nothing`).
- **Secrets stay in `.env.local`**, and every new variable is documented in
  `.env.example` with a placeholder — never a real value.

---

## 5. Verification

- **Never run `next build` during development.** It corrupts `.next` and strips
  CSS from the running dev server.
- Type-check instead: `pnpm --filter storefront type-check` (`tsc --noEmit`).
- Lint with `pnpm --filter storefront lint`.
- If a check fails, fix the cause. Never suppress an error to make output green,
  and never report work as done while a check is failing — say what failed and
  show the output.

---

## 6. Reporting back

- State plainly what you changed and what you verified. If you skipped part of a
  request, say which part and why.
- Flag any security-relevant decision you made, and any place you deliberately
  chose a setting over hardcoding (or vice versa).
- If you noticed a problem outside the task's scope, mention it — don't silently
  fix it and don't silently ignore it.

---

## 7. Checklist — run before you call any task done

**Toggles**
- [ ] Anything the owner might want to change is a setting in `/admin/settings`,
      not a constant and not an env var
- [ ] New settings: seeded in a migration, typed in `lib/settings.ts`, defaulted
      conservatively, exposed in the settings page, validated in the action

**Security**
- [ ] Every new server action / route handler starts with an auth check
      (`requireUser` / `requireStaff` / `requireAdmin`)
- [ ] Every `supabaseAdmin` query on user data filters by the authenticated
      user's id — no fetch-by-client-id alone
- [ ] All external input validated and clamped; no client-supplied prices,
      totals, or roles trusted
- [ ] New tables have RLS enabled with explicit policies
- [ ] No secret reachable from the client; no new `NEXT_PUBLIC_*` secret
- [ ] Webhooks verify signatures on the raw body and stay idempotent
- [ ] Errors shown to users are generic; details go to the server log only

**Code**
- [ ] No `any`, no dead code, no stray logging, no unrelated churn
- [ ] Existing helpers reused; conventions and comment style matched
- [ ] Affected paths revalidated
- [ ] `type-check` and `lint` pass — and you ran them rather than assuming
