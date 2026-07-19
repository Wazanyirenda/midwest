-- Newsletter signups from the homepage form.

create table newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table newsletter_subscribers enable row level security;
