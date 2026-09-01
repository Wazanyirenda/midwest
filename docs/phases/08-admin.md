# Phase 08 — Admin Dashboard

**Goal:** A self-hosted admin console at `/admin` for day-to-day business:
creating and editing products, managing images, tracking inventory with alerts,
and processing orders.

**Prerequisite:** Phase 01 verified ✅

> **Architecture note:** This phase originally targeted the Medusa admin panel on
> port 9000. Medusa was retired in favour of Supabase accessed directly from the
> Next.js app, so the admin is now a set of routes inside `apps/storefront`
> gated by `requireAdminOrRedirect()` and the `ADMIN_EMAILS` allowlist.

---

## Tasks

### 8.1 — Access control
- [x] `/admin` gated in middleware, in the layout, and again in every server action
- [x] `ADMIN_EMAILS` allowlist; empty allowlist denies everyone in production
- [x] Admin pages carry `robots: { index: false, follow: false }`

### 8.2 — Product management
- [x] Create a product from the UI (`/admin/products/new`) — saves as draft
- [x] Edit title, subtitle, description, handle, category, tags
- [x] Publish / unpublish without deleting
- [x] Delete a product (removes its storage objects; past orders keep records)

### 8.3 — Images
- [x] `product_images` table — multiple images per product, ordered
- [x] Drag-and-drop / click upload from the product editor, multi-file
- [x] Reorder and delete; position 0 syncs to `products.thumbnail` via trigger
- [x] JPEG / PNG / WebP / AVIF, 5 MB cap, stored in the `product-images` bucket

### 8.4 — Inventory
- [x] Per-variant `reorder_point` replaces the hardcoded threshold of 10
- [x] `/admin/inventory` — stock table, ±1 quick adjust, reason-coded adjustments
- [x] `inventory_adjustments` audit trail with actor, reason, note, resulting qty
- [x] Checkout sales log to the same trail via `decrement_inventory()`

### 8.5 — Alerts
- [x] Dashboard banner for out-of-stock variants and pending cancellations
- [x] Stock alerts panel, out-of-stock listed above low-stock
- [x] Badge count on the Inventory nav item
- [ ] Email digest when a variant crosses its reorder point *(deferred — see notes)*

### 8.6 — Stats
- [x] Revenue, orders, average order value, units sold — 30-day window with
      period-over-period change
- [x] Daily revenue chart with hover tooltip and a table view
- [x] Best sellers by units
- [x] Revenue counts `paid` / `shipped` / `delivered` only — never `pending`

### 8.7 — Orders
- [x] Order list with status, tracking entry, and per-order line items
- [x] Status changes email the customer (Phase 07)
- [ ] Customer lookup / internal notes
- [ ] Discount codes

---

## Verification Checklist

- [ ] Non-admin visiting `/admin` is redirected to `/`
- [ ] Can create a product, upload images, add a variant, and publish it
- [ ] The published product appears on `/products` with its image
- [ ] Reordering images changes the storefront thumbnail
- [ ] Setting a variant's stock below its reorder point raises an alert
- [ ] A manual adjustment appears in the adjustment history with the right actor
- [ ] Placing a test order decrements stock and logs a `sale` adjustment
- [ ] Revenue on the dashboard matches the sum of paid/shipped/delivered orders

---

## Key Files
- `apps/storefront/app/admin/` — dashboard, products, inventory, orders
- `apps/storefront/app/actions/admin-products.ts` — product/image/inventory actions
- `apps/storefront/app/actions/admin.ts` — order actions
- `apps/storefront/lib/admin.ts` — the `ADMIN_EMAILS` gate
- `apps/storefront/lib/admin-stats.ts` — dashboard aggregates
- `supabase/migrations/20260901000014_admin_dashboard.sql` — images, reorder
  points, adjustment trail

---

## Notes
- Email alerts were deliberately deferred: they need either a scheduled job or a
  post-checkout hook, and the in-dashboard banner covers the daily workflow.
- In production, put `/admin` behind Cloudflare with IP allowlisting on top of
  the email allowlist.

---

**Next:** [Phase 09 — Security & Rate Limiting](./09-security.md)
