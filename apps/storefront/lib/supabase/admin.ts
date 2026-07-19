import "server-only"
import { createClient } from "@supabase/supabase-js"

// Server-only client using the service-role key. All data access happens in
// server components / server actions; RLS denies everything to anon.
// IMPORTANT: this client bypasses RLS — every user-scoped query must filter
// by user_id explicitly. For identity (who is signed in) use lib/auth.ts.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
