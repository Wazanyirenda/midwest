# Phase 02 — Authentication

**Goal:** Users can sign up, sign in, and sign out. Account and checkout routes are protected. Unauthenticated users are redirected to sign-in.

**Prerequisite:** Phase 01 verified ✅

---

## Tasks

### 2.1 — Clerk Account Setup
- [ ] Create a free account at [clerk.com](https://clerk.com)
- [ ] Create a new application (name: "Midwestern Peptides")
- [ ] Enable email/password sign-in
- [ ] Optionally enable Google OAuth
- [ ] Copy API keys into `apps/storefront/.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```

### 2.2 — Clerk Already Wired In
The following is already implemented in the scaffold:
- `apps/storefront/app/layout.tsx` — `ClerkProvider` wraps the entire app
- `apps/storefront/middleware.ts` — protects `/account/*` and `/checkout/*`

- [ ] Confirm `apps/storefront/middleware.ts` exists and has the correct route matchers
- [ ] Restart the storefront dev server after adding Clerk keys

### 2.3 — Sign In / Sign Up Pages
- [ ] Create `apps/storefront/app/sign-in/[[...sign-in]]/page.tsx`:
  ```tsx
  import { SignIn } from "@clerk/nextjs"
  export default function SignInPage() {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SignIn />
      </main>
    )
  }
  ```
- [ ] Create `apps/storefront/app/sign-up/[[...sign-up]]/page.tsx`:
  ```tsx
  import { SignUp } from "@clerk/nextjs"
  export default function SignUpPage() {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SignUp />
      </main>
    )
  }
  ```

### 2.4 — Account Page (Protected)
- [ ] Create `apps/storefront/app/account/page.tsx`:
  ```tsx
  import { currentUser } from "@clerk/nextjs/server"
  import { redirect } from "next/navigation"

  export default async function AccountPage() {
    const user = await currentUser()
    if (!user) redirect("/sign-in")
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="mt-2 text-gray-600">Signed in as {user.emailAddresses[0]?.emailAddress}</p>
      </main>
    )
  }
  ```

### 2.5 — Nav Sign In / User Button
- [ ] Update the nav in `apps/storefront/app/page.tsx` to show:
  - `<SignInButton />` when signed out
  - `<UserButton />` when signed in
  - Import from `@clerk/nextjs`

---

## Verification Checklist

- [ ] `http://localhost:3000/sign-in` loads the Clerk sign-in widget
- [ ] `http://localhost:3000/sign-up` loads the Clerk sign-up widget
- [ ] Visiting `http://localhost:3000/account` while signed out → redirects to `/sign-in`
- [ ] After signing in → redirected back to `/account`, shows user email
- [ ] After signing out → account page is inaccessible again
- [ ] No errors in terminal or browser console

---

## Key Files
- `apps/storefront/middleware.ts` — route protection
- `apps/storefront/app/layout.tsx` — ClerkProvider
- `apps/storefront/app/sign-in/` — sign-in page
- `apps/storefront/app/sign-up/` — sign-up page
- `apps/storefront/app/account/page.tsx` — protected account page

---

**Next:** [Phase 03 — Product Catalog](./03-product-catalog.md)
