-- Automatic label printing: a queue of ZPL jobs for the Zebra ZD421C.
--
-- The store runs on serverless functions with no route into the shop's LAN, so
-- the printer is never addressed directly. Two deliveries drain this queue:
--
--   Zebra Data Services  — the printer holds an outbound Weblink connection to
--                          Zebra's cloud and we POST the label to
--                          api.zebra.com. Nothing runs at the shop. Preferred.
--   Local agent          — tools/print-agent polls the queue and writes raw ZPL
--                          to the printer on port 9100. The fallback for when
--                          the Zebra account isn't set up.
--
-- A queue rather than a direct call because printing must not be tied to the
-- webhook's lifetime: a printer that is offline, jammed, or out of labels when
-- the payment lands still prints once it comes back, and every attempt is
-- visible instead of lost in a log.

create table if not exists print_jobs (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders (id) on delete cascade,
  kind       text not null default 'order_label'
             check (kind in ('order_label', 'test')),
  payload    text not null,
  status     text not null default 'queued'
             check (status in ('queued', 'claimed', 'printed', 'failed')),
  attempts   integer not null default 0,
  last_error text,
  claimed_at timestamptz,
  printed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Partial: the queue is drained constantly, so only unfinished rows are worth
-- indexing. Printed history stays queryable by order_id via the fk scan.
create index if not exists print_jobs_pending_idx
  on print_jobs (created_at) where status in ('queued', 'claimed');

create index if not exists print_jobs_order_idx on print_jobs (order_id);

alter table print_jobs enable row level security;
-- No policies at all: service role only. Labels carry the customer's name and
-- home address, so nothing anon or authenticated may read this table.

-- ─── Settings ────────────────────────────────────────────────────────────────
-- Off by default: no order prints anything until the printer is confirmed
-- working and the owner switches it on.

insert into site_settings (key, value) values
  ('auto_print_order_labels', 'false'::jsonb),
  ('print_label_copies',      '1'::jsonb),
  -- Zebra serial number, from the printer's label or `! U1 getvar "device.unique_id"`.
  -- Empty means cloud printing is not configured and jobs wait for the agent.
  ('label_printer_serial',    '""'::jsonb),
  -- LAN address for the local agent. Empty means the agent uses its own config.
  ('label_printer_host',      '""'::jsonb)
on conflict (key) do nothing;

-- ─── Claim ───────────────────────────────────────────────────────────────────
-- Hands a batch of jobs to one caller and to no one else. `skip locked` so two
-- agents (or an agent racing a retry) can never grab the same label and print
-- it twice.
--
-- A claim that is never acknowledged — agent killed mid-print, network dropped
-- — is reclaimable after p_stale_seconds. That risks a duplicate label when the
-- print actually succeeded, which is the right way round: a spare label costs a
-- cent, a missing one costs a shipment.

create or replace function claim_print_jobs(
  p_limit          integer default 5,
  p_stale_seconds  integer default 120,
  p_max_attempts   integer default 5
) returns table (id uuid, payload text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retire jobs that have burned their attempts, so a label the printer keeps
  -- rejecting stops blocking the queue and shows up as failed in admin.
  update print_jobs
     set status = 'failed',
         last_error = coalesce(last_error, 'no acknowledgement after retries')
   where status = 'claimed'
     and attempts >= p_max_attempts
     and claimed_at < now() - make_interval(secs => p_stale_seconds);

  return query
  update print_jobs j
     set status = 'claimed',
         claimed_at = now(),
         attempts = j.attempts + 1
   where j.id in (
     select c.id
       from print_jobs c
      where c.attempts < p_max_attempts
        and (
          c.status = 'queued'
          or (c.status = 'claimed'
              and c.claimed_at < now() - make_interval(secs => p_stale_seconds))
        )
      order by c.created_at
      limit p_limit
      for update skip locked
   )
  returning j.id, j.payload;
end;
$$;

revoke execute on function claim_print_jobs(integer, integer, integer)
  from public, anon, authenticated;
grant execute on function claim_print_jobs(integer, integer, integer)
  to service_role;
