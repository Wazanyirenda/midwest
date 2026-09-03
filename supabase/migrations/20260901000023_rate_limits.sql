-- Rate limiting for anything that sends email, creates accounts, attempts
-- payment, or is guessable by brute force (AGENTS.md §3).
--
-- Postgres-backed rather than in-memory: the app runs on serverless instances
-- that don't share memory, so a per-process counter enforces nothing. No new
-- infrastructure — Phase 09 proposed Redis, but this needs none.

create table if not exists rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, window_start)
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- Fixed window rather than sliding: a caller can get up to 2× the limit across
-- a window boundary. Accepted deliberately — it is one statement, has no
-- background job, and the threat here is scripted abuse, not a precise quota.
create or replace function check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into rate_limits (bucket, window_start, count)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup so the table can't grow without bound; cheap because
  -- it only ever touches this bucket's expired windows.
  delete from rate_limits
  where bucket = p_bucket and window_start < now() - interval '1 day';

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'retry_after',
      greatest(
        0,
        ceil(extract(epoch from
          (v_window_start + make_interval(secs => p_window_seconds)) - now()
        ))
      )::integer
  );
end;
$$;

alter table rate_limits enable row level security;
-- No anon policies: service role only. A client that could read or write this
-- table could clear its own counter.

revoke execute on function check_rate_limit(text, integer, integer)
  from anon, authenticated;
