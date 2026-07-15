# Phase 07 — Orders & Email

**Goal:** Customers receive transactional emails. They can view their order history in their account. Order lifecycle states are handled correctly.

**Prerequisite:** Phase 06 verified ✅

---

## Tasks

### 7.1 — Resend Account & Setup
- [ ] Create an account at [resend.com](https://resend.com)
- [ ] Verify your sending domain (or use the Resend sandbox for testing)
- [ ] Get your API key and add to `apps/backend/.env`:
  ```
  RESEND_API_KEY=re_...
  FROM_EMAIL=orders@midwesternpeptides.com
  ```
- [ ] Install Resend in the backend:
  ```bash
  pnpm add resend --filter backend
  ```

### 7.2 — Order Confirmation Email
- [ ] Create `apps/backend/src/jobs/send-order-confirmation.ts` as a Medusa subscriber
- [ ] Triggered when order status changes to `pending` (payment captured)
- [ ] Email includes:
  - Order number
  - Items ordered (name, quantity, price)
  - Shipping address
  - Total paid
  - Payment method (Card / Crypto)
  - **Research Use Only disclaimer**
  - Contact/support info
- [ ] Use a clean HTML email template (inline styles for email client compatibility)

### 7.3 — Order Shipped Email
- [ ] Create `apps/backend/src/jobs/send-order-shipped.ts`
- [ ] Triggered when fulfillment is created and tracking number is added
- [ ] Email includes: tracking number, carrier, estimated delivery

### 7.4 — Account — Order History Page
- [ ] Create `apps/storefront/app/account/orders/page.tsx`:
  - List of past orders (order number, date, status, total)
  - Each row links to the order detail page
  - Empty state if no orders yet

### 7.5 — Account — Order Detail Page
- [ ] Create `apps/storefront/app/account/orders/[id]/page.tsx`:
  - Full order details (items, address, payment method, status)
  - Order status timeline (Pending → Processing → Shipped → Delivered)
  - Tracking number and link (when available)

### 7.6 — Order Lifecycle States
Verify all transitions work correctly in the Medusa admin:
- [ ] `pending` → payment received, awaiting fulfillment
- [ ] `processing` → being picked and packed
- [ ] `shipped` → tracking number added, fulfillment sent
- [ ] `delivered` → confirmed by carrier or customer

---

## Verification Checklist

- [ ] Placing an order with Stripe → order confirmation email received within 60 seconds
- [ ] Placing an order with crypto → order confirmation email received after IPN webhook
- [ ] Order appears in customer's account under "My Orders"
- [ ] Order detail page shows correct items, address, payment method
- [ ] Marking an order as shipped in Medusa admin → shipped email sent with tracking
- [ ] Emails do not contain any medical claims
- [ ] "Research Use Only" disclaimer present in order confirmation email
- [ ] No PII (email, address) visible in backend server logs

---

## Key Files
- `apps/backend/src/jobs/send-order-confirmation.ts` — order confirmation subscriber
- `apps/backend/src/jobs/send-order-shipped.ts` — shipment notification subscriber
- `apps/storefront/app/account/orders/page.tsx` — order history
- `apps/storefront/app/account/orders/[id]/page.tsx` — order detail

---

**Next:** [Phase 08 — Admin Dashboard](./08-admin.md)
