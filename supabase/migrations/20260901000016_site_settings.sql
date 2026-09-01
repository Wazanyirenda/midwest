-- Storefront settings the owner can toggle from /admin/settings, instead of
-- flags that need a code change and a deploy.
--
-- Key/value rather than a wide single row: adding a setting is an insert, not a
-- migration, and a key the app doesn't know about is harmless.

create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Defaults are also hardcoded in lib/settings.ts, so a missing row or an
-- unreachable table degrades to sensible behaviour rather than a broken page.
insert into site_settings (key, value) values
  ('show_payment_badges',   'true'::jsonb),
  ('show_apple_pay_badge',  'false'::jsonb),
  ('show_amazon_pay_badge', 'false'::jsonb),
  ('show_crypto_payment',   'false'::jsonb),
  ('hide_out_of_stock',     'false'::jsonb),
  ('show_announcement',     'false'::jsonb),
  ('announcement_text',     '""'::jsonb)
on conflict (key) do nothing;

alter table site_settings enable row level security;

-- Settings drive public page rendering, so anon may read them. Writes are
-- service-role only (the admin actions), which RLS denies by default.
create policy "Public can read site settings"
  on site_settings for select using (true);
