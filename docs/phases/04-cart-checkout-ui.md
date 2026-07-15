# Phase 04 — Cart & Checkout UI

**Goal:** Users can add products to a cart, view it, enter a shipping address, and reach the payment step. No real payment is processed yet — that's Phase 05/06.

**Prerequisite:** Phase 03 verified ✅

---

## Tasks

### 4.1 — Cart via Medusa API
Medusa handles cart state server-side. The storefront creates and updates a cart via the Medusa JS SDK.

- [ ] Cart ID stored in a cookie (`medusa_cart_id`) — Medusa JS SDK handles this automatically with session auth
- [ ] Create `apps/storefront/lib/cart.ts` with helpers:
  - `getOrCreateCart()` — retrieves existing cart or creates new one
  - `addToCart(variantId, quantity)` — adds line item
  - `removeFromCart(lineItemId)` — removes line item
  - `updateLineItem(lineItemId, quantity)` — updates qty

### 4.2 — Add to Cart Button
- [ ] "Add to Cart" button on product detail page calls `addToCart()` via a Server Action
- [ ] Button shows loading state while submitting
- [ ] Shows success feedback after item added
- [ ] Cart item count updates in the nav

### 4.3 — Cart Page
- [ ] Create `apps/storefront/app/(store)/cart/page.tsx`:
  - List of line items with product name, variant, quantity, price
  - Quantity update controls (+/-)
  - Remove item button
  - Order subtotal
  - "Proceed to Checkout" button → `/checkout`
  - Empty cart state with link back to products

### 4.4 — Checkout — Step 1: Contact & Shipping Address
- [ ] Create `apps/storefront/app/(store)/checkout/page.tsx`
- [ ] Multi-step form using React Hook Form + Zod validation:
  - **Step 1:** Email, first name, last name, phone
  - **Step 2:** Shipping address (line1, line2, city, state, zip, country)
  - **Step 3:** Payment method selection (Stripe card / Crypto) ← placeholder for now
- [ ] All fields validated client-side with Zod before submission
- [ ] Shipping address submitted to Medusa cart via Server Action

### 4.5 — Checkout — Age Verification Gate
- [ ] Before checkout begins, show age confirmation:
  ```
  "By continuing, I confirm I am 21 years of age or older and
   purchasing these products for legitimate research purposes only."
  [ ] I confirm — [Continue to Checkout]
  ```
- [ ] If not confirmed, cannot proceed

### 4.6 — Order Summary Sidebar
- [ ] Checkout page shows a persistent order summary on the right:
  - Line items with quantities and prices
  - Subtotal
  - Shipping (TBD after shipping is configured)
  - Total

---

## Verification Checklist

- [ ] "Add to Cart" on a product detail page works — item appears in cart
- [ ] Cart page shows correct items, quantities, and prices
- [ ] Removing an item from cart works
- [ ] Updating quantity works
- [ ] Clicking "Proceed to Checkout" → navigates to `/checkout`
- [ ] Unauthenticated users hitting `/checkout` → redirected to sign-in (middleware)
- [ ] Age gate modal appears at start of checkout
- [ ] Shipping address form validates and submits to Medusa
- [ ] Order summary sidebar shows correct totals
- [ ] No errors in terminal or browser console

---

## Key Files
- `apps/storefront/lib/cart.ts` — cart helper functions
- `apps/storefront/app/(store)/cart/page.tsx` — cart page
- `apps/storefront/app/(store)/checkout/page.tsx` — checkout flow
- `apps/storefront/middleware.ts` — protects `/checkout`

---

## Notes
- Medusa's cart API handles stock validation — if something is out of stock it will return an error. Handle this gracefully in the UI.
- Do not store cart state in Zustand or local state — always source it from Medusa. The cart ID cookie is the single source of truth.

---

**Next:** [Phase 05 — Payments (Stripe)](./05-payments-stripe.md)
