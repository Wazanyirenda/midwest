-- Email platform: consent, unsubscribe tokens, a send log, and campaigns.
--
-- The governing rule, enforced in lib/email.ts rather than by convention:
-- transactional mail (order confirmations, password resets) always sends;
-- marketing mail (promotions, abandoned-cart reminders) sends ONLY with
-- recorded consent. Abandoned-cart counts as marketing — regulators generally
-- treat it that way, and guessing wrong is expensive.

-- ─── Unsubscribe tokens ──────────────────────────────────────────────────────
-- Unguessable per-recipient token so one-click unsubscribe needs no login,
-- which Gmail/Yahoo bulk-sender rules effectively require.

alter table newsletter_subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists newsletter_subscribers_token_key
  on newsletter_subscribers (unsubscribe_token);

alter table profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_key
  on profiles (unsubscribe_token);

-- ─── Send log ────────────────────────────────────────────────────────────────
-- Every send, transactional or marketing. Two jobs: stop the abandoned-cart job
-- emailing the same cart on every run, and give you an audit trail of what was
-- sent to whom (which CAN-SPAM disputes turn on).

create table if not exists email_log (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  template   text not null,
  category   text not null check (category in ('transactional', 'marketing')),
  -- What the mail was about: an order id, a cart id, a campaign id.
  entity_id  text,
  subject    text,
  status     text not null default 'sent' check (status in ('sent', 'failed', 'suppressed')),
  error      text,
  sent_at    timestamptz not null default now()
);

create index if not exists email_log_to_template_idx on email_log (to_email, template, sent_at desc);
create index if not exists email_log_entity_idx on email_log (template, entity_id);
create index if not exists email_log_sent_at_idx on email_log (sent_at desc);

-- ─── Campaigns ───────────────────────────────────────────────────────────────

create table if not exists email_campaigns (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null,
  body         text not null,
  status       text not null default 'draft'
               check (status in ('draft', 'sending', 'sent', 'failed')),
  recipients   integer not null default 0,
  sent_count   integer not null default 0,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);

create index if not exists email_campaigns_created_at_idx on email_campaigns (created_at desc);

-- ─── Consent resolution ──────────────────────────────────────────────────────
-- One answer to "may we send marketing to this address?", so the app never has
-- to combine the two consent sources by hand and get it subtly wrong.
--
-- Rules, in order:
--   1. An explicit "no" from EITHER source blocks — a newsletter unsubscribe or
--      an account with marketing opt-in turned off. Opting out anywhere means
--      opted out everywhere.
--   2. Otherwise, an explicit "yes" from either source allows.
--   3. Silence is not consent: no record at all means no.
create or replace function may_email_marketing(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with opted_out as (
    select 1
    from newsletter_subscribers n
    where lower(n.email) = lower(p_email) and n.unsubscribed_at is not null
    union all
    select 1
    from profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower(p_email) and p.marketing_email_opt_in = false
  ),
  opted_in as (
    select 1
    from newsletter_subscribers n
    where lower(n.email) = lower(p_email) and n.unsubscribed_at is null
    union all
    select 1
    from profiles p
    join auth.users u on u.id = p.id
    where lower(u.email) = lower(p_email) and p.marketing_email_opt_in
  )
  select not exists (select 1 from opted_out)
     and exists (select 1 from opted_in);
$$;

-- ─── Owner-controlled settings ───────────────────────────────────────────────
-- Per AGENTS.md §2: the postal address and the reminder timing are things the
-- owner will want to change without a developer, so they are settings — not
-- env vars and not constants.

insert into site_settings (key, value) values
  ('abandoned_cart_emails',      'false'::jsonb),
  ('marketing_emails',           'false'::jsonb),
  ('abandoned_cart_delay_hours', '1'::jsonb),
  ('abandoned_cart_window_hours','48'::jsonb),
  ('business_postal_address',    '""'::jsonb)
on conflict (key) do nothing;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table email_log       enable row level security;
alter table email_campaigns enable row level security;
-- No anon policies: service role only. Unsubscribe goes through a server page
-- that looks the token up with the service-role client.

revoke execute on function may_email_marketing(text) from anon, authenticated;
