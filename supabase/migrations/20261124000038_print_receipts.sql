-- Receipts join the print queue, for an office printer beside the Zebra.
--
-- A print station on the shop network (tools/print-agent/SHOP_PC_PROMPT.md)
-- now drives two printers: 4x6 shipping labels on the Zebra, and the A4
-- receipt that goes in the box on a regular printer. Both come through
-- print_jobs, so they share the queue's claim, retry and failure handling.
--
-- A receipt job stores no payload. The PDF carries the customer's address and
-- every price, so it is drawn when the station claims the job and never kept,
-- the same rule as the receipt attached to order emails.

alter table print_jobs drop constraint if exists print_jobs_kind_check;
alter table print_jobs add constraint print_jobs_kind_check
  check (kind in ('order_label', 'test', 'order_receipt'));

-- ─── Settings ────────────────────────────────────────────────────────────────
-- Off by default, like labels: nothing prints until the station is confirmed
-- working. The return address is empty until the owner sets it; the label
-- leaves its FROM block out rather than print a made-up address.

insert into site_settings (key, value) values
  ('auto_print_order_receipts', 'false'::jsonb),
  ('return_address',            '""'::jsonb)
on conflict (key) do nothing;

-- ─── Claim ───────────────────────────────────────────────────────────────────
-- Gains p_kinds, so the station only takes jobs for printers that are up: a
-- receipt printer that is switched off leaves receipts waiting instead of
-- burning their attempts, while labels keep printing. The default is labels
-- only, so an older agent that knows nothing about receipts is never handed a
-- PDF to send to the Zebra. Also returns each job's kind and order, so the
-- endpoint can draw receipts and tell the station which printer each job is
-- for.
--
-- Dropped first because the arguments and the returned columns change, and
-- create or replace would otherwise leave the old signature beside the new.

drop function if exists claim_print_jobs(integer, integer, integer);

create or replace function claim_print_jobs(
  p_limit          integer default 5,
  p_stale_seconds  integer default 120,
  p_max_attempts   integer default 5,
  p_kinds          text[]  default array['order_label', 'test']
) returns table (id uuid, kind text, order_id uuid, payload text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retire jobs that have burned their attempts, so a job the printer keeps
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
        and c.kind = any (p_kinds)
        and (
          c.status = 'queued'
          or (c.status = 'claimed'
              and c.claimed_at < now() - make_interval(secs => p_stale_seconds))
        )
      order by c.created_at
      limit p_limit
      for update skip locked
   )
  returning j.id, j.kind, j.order_id, j.payload;
end;
$$;

revoke execute on function claim_print_jobs(integer, integer, integer, text[])
  from public, anon, authenticated;
grant execute on function claim_print_jobs(integer, integer, integer, text[])
  to service_role;
