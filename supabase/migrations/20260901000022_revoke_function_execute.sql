-- SECURITY FIX: every SECURITY DEFINER function in public was callable by anon.
--
-- Earlier migrations ended with `revoke execute ... from anon, authenticated`,
-- which does nothing useful: Postgres grants EXECUTE on a new function to the
-- PUBLIC pseudo-role, and revoking from a specific role does not remove a grant
-- held by PUBLIC. anon and authenticated inherit it.
--
-- Impact before this fix — all callable through PostgREST's /rpc with the anon
-- key that ships in the client bundle:
--   decrement_inventory      — zero out any variant's stock
--   process_payment_success  — mark an order paid given its payment reference
--   process_payment_refund   — flip an order to refunded
--   check_rate_limit         — burn another account's sign-in allowance (lockout)
--   may_email_marketing      — probe whether an address is on the list
--
-- Revoking from PUBLIC is what actually removes it. service_role is granted
-- back explicitly, since that is the identity the server uses.
--
-- Trigger functions are unaffected by the revoke: a trigger runs as the table
-- owner regardless of who caused it, so they keep working while no longer being
-- directly callable.
--
-- Written as a loop over functions that exist rather than as explicit REVOKE
-- statements, for two reasons: it is safe to re-run (AGENTS.md §4), and it does
-- not hard-fail on a fresh database where a later migration has not yet created
-- one of the functions named above (check_rate_limit arrives in 000023).

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef                      -- security definer only
      and p.prorettype <> 'event_trigger'::regtype  -- Supabase's own rls_auto_enable
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end
$$;

-- Future functions default to PUBLIC EXECUTE again unless this is set, so make
-- the safe state the default for anything added later in this schema.
alter default privileges in schema public revoke execute on functions from public;
