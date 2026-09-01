# Midwestern Peptides

**Before writing or changing any code in this repo, read [AGENTS.md](AGENTS.md)
in full — every task, every session, no exceptions.** It is the authoritative
guide for this codebase; this file only exists to point you at it. Do not start
work, plan an approach, or answer a "how should I build X" question here without
having read it first.

The three rules that decide most tasks, so you know what you're reading for:

1. **Toggle, don't hardcode.** If the store owner might reasonably want it
   different, it belongs in `site_settings` and `/admin/settings` — not in a
   constant, not behind an env var. AGENTS.md §2 has the exact recipe.
2. **Authorize inside every mutation.** `requireUser` / `requireStaff` /
   `requireAdmin` at the top of each server action and route handler. Middleware
   is a UX filter, not a security boundary. AGENTS.md §3.
3. **`supabaseAdmin` bypasses RLS.** Every user-scoped query through it must
   filter by the authenticated user's id explicitly.

Never run `next build` during development — it corrupts `.next` and strips CSS.
Use `pnpm --filter storefront type-check`.
