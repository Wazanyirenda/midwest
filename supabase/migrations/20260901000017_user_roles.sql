-- Roles in the database, replacing the ADMIN_EMAILS environment variable.
--
-- Before this, admin access was a comma-separated env var: adding a staff
-- member meant editing config and redeploying, and access was all-or-nothing.
--
--   customer — the default. Storefront only.
--   staff    — orders and inventory (day-to-day fulfilment).
--   admin    — everything, including products, pricing, settings, and roles.

alter table profiles
  add column role text not null default 'customer'
  check (role in ('customer', 'staff', 'admin'));

create index profiles_role_idx on profiles (role) where role <> 'customer';

-- Seed from the ADMIN_EMAILS allowlist as it stood at migration time, so the
-- existing owner keeps access. Without this the first deploy locks everyone out
-- of /admin.
update profiles
set role = 'admin', updated_at = now()
where id in (
  select id from auth.users
  where lower(email) in ('mwpeptides@gmail.com')
);

-- Own-row reads are already covered by the profiles RLS policy, so middleware
-- can read its own role with the user's session. Nobody may write their own
-- role — that goes through the service-role client after an admin check.
create policy "Users cannot change their own role"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from profiles p where p.id = auth.uid())
  );
