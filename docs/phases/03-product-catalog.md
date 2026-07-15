# Phase 03 — Product Catalog

**Goal:** Research peptides are seeded into the database and visible on the storefront. Product listing and product detail pages are live with ISR caching.

**Prerequisite:** Phase 02 verified ✅

---

## Tasks

### 3.1 — Seed the Database
- [ ] Run from `apps/backend/`:
  ```bash
  pnpm seed
  ```
- [ ] Confirm in Medusa admin (`localhost:9000/app`) → Products shows BPC-157, TB-500, Semaglutide

### 3.2 — Create a Region & Sales Channel
In Medusa admin:
- [ ] Go to **Settings → Regions** → create a "United States" region with USD currency
- [ ] Go to **Settings → Sales Channels** → note the default sales channel ID
- [ ] Add products to the sales channel

### 3.3 — Product Listing Page
Already scaffolded at `apps/storefront/app/(store)/products/page.tsx`.

- [ ] Visit `http://localhost:3000/products`
- [ ] Products appear (BPC-157, TB-500, Semaglutide)
- [ ] Each shows a price
- [ ] "Research Use Only" disclaimer is visible above the list

### 3.4 — Product Detail Page
- [ ] Create `apps/storefront/app/(store)/products/[handle]/page.tsx` with:
  - Product title and description
  - Variant selector (size/purity dropdown or buttons)
  - Price display
  - "Add to Cart" button (placeholder for now)
  - **Prominent research-use-only disclaimer**
  - Placeholder for COA link (e.g., "Certificate of Analysis — coming soon")
  - Batch/lot number field (placeholder)

### 3.5 — Product Page Metadata
- [ ] Each product detail page uses `generateMetadata()` to set:
  - `title`: product name
  - `description`: product description (no medical claims)
  - `openGraph` image

### 3.6 — ISR Caching
- [ ] Product listing page has `export const revalidate = 3600` (already in scaffold)
- [ ] Product detail page has `export const revalidate = 3600`
- [ ] `generateStaticParams()` is implemented on the detail page so products are pre-rendered at build time

---

## Verification Checklist

- [ ] `http://localhost:3000/products` → shows all seeded products with prices
- [ ] `http://localhost:3000/products/bpc-157` → product detail page loads
- [ ] `http://localhost:3000/products/tb-500` → product detail page loads
- [ ] Each product detail page has the research-use-only disclaimer
- [ ] No 404s on product pages
- [ ] No errors in terminal

---

## Key Files
- `apps/backend/src/scripts/seed.ts` — product seed data
- `apps/storefront/app/(store)/products/page.tsx` — listing (ISR)
- `apps/storefront/app/(store)/products/[handle]/page.tsx` — detail (to be built)

---

## Notes
- Never write medical claims in product descriptions. Keep it: mechanism of action, molecular formula, research context only.
- COA links will be wired to real PDFs in a later phase.

---

**Next:** [Phase 04 — Cart & Checkout UI](./04-cart-checkout-ui.md)
