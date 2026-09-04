-- Crypto payments (NOWPayments) and a switch for card checkout.
--
-- Card is gated because Stripe's Restricted Businesses policy prohibits
-- peptides: an account that processes them is closed with funds held 90-180
-- days. The integration stays built and tested, but must not go live until a
-- processor that permits this category is in place. Default is OFF.
--
-- Crypto needs no underwriting and cannot be switched off by an acquirer, so it
-- is the rail that actually works for this catalogue today.

-- ─── Underpayment review ─────────────────────────────────────────────────────
-- Crypto customers send from their own wallet and can underpay. The order must
-- not be marked paid, and must not be silently rejected either — it needs a
-- human. Stored as a reason rather than a status so the order stays 'pending'
-- and every existing query keeps behaving.

alter table orders
  add column if not exists payment_review_reason text,
  add column if not exists amount_received_cents integer;

create index if not exists orders_payment_review_idx
  on orders (payment_review_reason) where payment_review_reason is not null;

-- ─── Settings ────────────────────────────────────────────────────────────────
-- Conservative defaults: nothing takes money until it is deliberately enabled.

insert into site_settings (key, value) values
  ('card_payments_enabled',   'false'::jsonb),
  ('crypto_payments_enabled', 'false'::jsonb),
  -- Under/overpayment tolerance. Network fees mean an exact match is rare, so a
  -- small shortfall is accepted rather than sent to review.
  ('crypto_tolerance_percent', '2'::jsonb)
on conflict (key) do nothing;

-- ─── Underpayment recorder ───────────────────────────────────────────────────
-- Mirrors process_payment_success: same webhook_events ledger, same
-- exactly-once guarantee, but flags for review instead of marking paid.

create or replace function process_payment_underpaid(
  p_provider          text,
  p_event_id          text,
  p_event_type        text,
  p_payment_reference text,
  p_amount_cents      integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   orders%rowtype;
  v_claimed boolean;
begin
  -- Claim the event first; a duplicate delivery is a no-op.
  insert into webhook_events (provider, event_id, type)
  values (p_provider, p_event_id, p_event_type)
  on conflict (provider, event_id) do nothing;
  get diagnostics v_claimed = row_count;

  if v_claimed = false then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into v_order from orders
  where payment_reference = p_payment_reference and payment_provider = p_provider
  for update;

  if not found then
    -- Raise so the handler returns 500 and the provider retries: the order may
    -- not have been committed yet.
    raise exception 'no order for reference %', p_payment_reference;
  end if;

  update orders
  set payment_review_reason = format(
        'Underpaid: received %s of %s cents', p_amount_cents, v_order.total_cents
      ),
      amount_received_cents = p_amount_cents,
      updated_at = now()
  where id = v_order.id;

  return jsonb_build_object('status', 'review', 'order_id', v_order.id);
end;
$$;

revoke execute on function process_payment_underpaid(text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function process_payment_underpaid(text, text, text, text, integer)
  to service_role;
