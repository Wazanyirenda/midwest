-- Email alerts for receipt printing.
--
-- print_alert_email: where the alert goes. Empty means no alerts — there is no
-- safe address to guess, and ADMIN_EMAILS is an emergency bootstrap that is
-- meant to be unset in normal operation.
insert into site_settings (key, value) values
  ('print_alert_email', '""'::jsonb)
on conflict (key) do nothing;

-- When the local print agent last polled. The agent stops polling while the
-- printer is unreachable, so a stale timestamp means "receipts are not going
-- to print right now" whichever end is down: the PC, the agent or the printer.
-- One row, pinned by the check constraint.
create table if not exists print_agent_status (
  id           smallint primary key default 1 check (id = 1),
  last_seen_at timestamptz not null default now()
);

alter table print_agent_status enable row level security;
-- No policies: service role only, like print_jobs.
