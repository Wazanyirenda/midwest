# Phase 08 — Admin Dashboard

**Goal:** The Medusa admin panel is fully operational for day-to-day business: managing products, processing orders, managing customers, and viewing basic sales data.

**Prerequisite:** Phase 07 verified ✅

---

## Tasks

### 8.1 — Medusa Admin Access
The admin UI is built into `@medusajs/dashboard` and served at `localhost:9000/app`.

- [ ] Log in with the admin credentials created in Phase 01
- [ ] Confirm all menu sections load: Products, Orders, Customers, Inventory, Settings

### 8.2 — Product Management
- [ ] Create a new product through the admin UI (not just seed)
- [ ] Add product images (uploaded via Medusa admin)
- [ ] Set up product categories (e.g., "GH Peptides", "Healing Peptides", "Weight Loss Peptides")
- [ ] Assign products to categories
- [ ] Add batch/lot number as a product metadata field
- [ ] Add COA URL as a product metadata field (link to a PDF)

### 8.3 — Inventory Management
- [ ] Confirm inventory levels show for each variant
- [ ] Test adjusting inventory manually through admin
- [ ] Set up low-stock threshold (Medusa doesn't have built-in alerts — note this for Phase 09)

### 8.4 — Order Processing Workflow
Define and test the standard workflow:
- [ ] New order arrives → admin receives notification (email — from Phase 07)
- [ ] Admin opens order in Medusa admin → reviews items
- [ ] Admin creates a fulfillment → enters tracking number
- [ ] Order status updates → customer gets shipped email (from Phase 07)
- [ ] Practice the full flow with a test order end-to-end

### 8.5 — Customer Management
- [ ] View customer list in Medusa admin
- [ ] View individual customer order history
- [ ] Add internal notes to a customer record (for support)

### 8.6 — Admin User Roles (If Multiple Staff)
- [ ] If you have other staff: go to **Settings → Team** and invite them
- [ ] Assign appropriate roles (avoid giving full admin access to fulfillment staff)

### 8.7 — Discount Codes
- [ ] Create a test discount code (e.g., `RESEARCH10` for 10% off)
- [ ] Test applying it at checkout
- [ ] Set expiry date and usage limit

---

## Verification Checklist

- [ ] Admin login works
- [ ] Can create, edit, and delete a product through admin UI
- [ ] Can upload a product image
- [ ] Can manually adjust inventory
- [ ] Can process a test order (create fulfillment, add tracking)
- [ ] Can look up a customer and see their order history
- [ ] Discount code works at checkout
- [ ] Admin is not accessible from the public storefront URL (it's on port 9000, not 3000)

---

## Key Files
- `apps/backend/medusa-config.ts` — `admin.backendUrl` setting
- `apps/backend/.env` — `MEDUSA_BACKEND_URL`, `DISABLE_MEDUSA_ADMIN`

---

## Notes
- In production, you'll want to serve the admin on a subdomain like `admin.midwesternpeptides.com` behind Cloudflare with IP allowlisting
- Never expose the admin at a public predictable URL without additional auth protection

---

**Next:** [Phase 09 — Security & Rate Limiting](./09-security.md)
