-- Bulk-email controls the owner can change, without ever holding a secret.
--
-- Deliberately NOT stored here: API keys and SMTP passwords. site_settings is
-- publicly readable (settings drive public page rendering), so a secret in this
-- table would be exposed to anyone with the anon key. Credentials stay in env
-- vars — see AGENTS.md §2 and §3.
--
-- marketing_transport picks which configured transport bulk mail uses:
--   'same'   — whatever transactional uses (a mailbox host like Porkbun)
--   'resend' — the bulk provider, when RESEND_API_KEY is present
-- Mailbox hosts cap daily sends and generally forbid marketing mail, so a store
-- with real list volume wants these split.

insert into site_settings (key, value) values
  ('marketing_transport',  '"same"'::jsonb),
  ('marketing_daily_cap',  '200'::jsonb)
on conflict (key) do nothing;
