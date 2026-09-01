-- Payment webhooks: make the provider's signed callback the source of truth for
-- payment state, processed exactly once.
--
-- Before this, the browser called completeCart() after Stripe confirmed, and
-- that action set status='paid' without ever asking Stripe. A dropped
-- connection meant a charged customer with no order; a crafted request meant a
-- paid order with no charge.

-- ─── Idempotency ledger ──────────────────────────────────────────────────────
-- Providers redeliver events when a response is lost. The event id is the
-- dedupe key, and it is written in the SAME transaction as the work it guards —
-- otherwise a crash between the two loses the exactly-once guarantee.
-- `provider` is generic so NOWPayments IPN (Phase 06) reuses this table.

create table webhook_events (
  provider    text not null,
  event_id    text not null,
  type        text,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ─── One order per payment ───────────────────────────────────────────────────
-- Makes "a PaymentIntent maps to at most one order" a database guarantee rather
-- than application logic that a race can slip past.

create unique index orders_payment_reference_key
  on orders (payment_reference)
  where payment_reference is not null;

-- ─── Refunds need a status ───────────────────────────────────────────────────

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'delivered', 'canceled', 'refunded'));

-- ─── Exactly-once payment processing ─────────────────────────────────────────
-- Records the event, flips the order, and decrements stock atomically.
--
-- Raises (rather than returning) when no order matches, so the transaction
-- rolls back — including the event row. The route turns that into a 500 and the
-- provider retries. Returning success there would strand a real payment.

create or replace function process_payment_success(
  p_provider          text,
  p_event_id          text,
  p_event_type        text,
  p_payment_reference text,
  p_amount_cents      integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  insert into webhook_events (provider, event_id, type)
  values (p_provider, p_event_id, p_event_type)
  on conflict (provider, event_id) do nothing;

  -- Already processed: the provider is retrying a delivery whose response was
  -- lost. Do nothing and report success so it stops retrying.
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into v_order
  from orders
  where payment_reference = p_payment_reference
  for update;

  if not found then
    raise exception 'No order for payment reference %', p_payment_reference
      using errcode = 'no_data_found';
  end if;

  -- Guard against a provider reporting an amount we never asked for.
  if p_amount_cents is not null and p_amount_cents <> v_order.total_cents then
    raise exception 'Amount mismatch for %: charged %, order total %',
      p_payment_reference, p_amount_cents, v_order.total_cents
      using errcode = 'check_violation';
  end if;

  -- A different event id for an order already advanced past pending (a second
  -- succeeded event, or an order shipped before the retry landed).
  if v_order.status <> 'pending' then
    return jsonb_build_object(
      'status', 'already_processed',
      'order_id', v_order.id
    );
  end if;

  update orders
  set status = 'paid', updated_at = now()
  where id = v_order.id;

  select jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity))
  into v_items
  from order_items
  where order_id = v_order.id and variant_id is not null;

  -- Same call the old checkout used; it also writes the 'sale' audit row.
  if v_items is not null then
    perform decrement_inventory(v_items);
  end if;

  return jsonb_build_object(
    'status', 'processed',
    'order_id', v_order.id,
    'display_id', v_order.display_id,
    'email', v_order.email
  );
end;
$$;

-- ─── Refunds and disputes ────────────────────────────────────────────────────
-- Stock is deliberately NOT restored: a refunded vial is rarely resellable, and
-- silently re-adding it would misstate inventory. Adjust by hand if it comes back.

create or replace function process_payment_refund(
  p_provider          text,
  p_event_id          text,
  p_event_type        text,
  p_payment_reference text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  insert into webhook_events (provider, event_id, type)
  values (p_provider, p_event_id, p_event_type)
  on conflict (provider, event_id) do nothing;

  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select * into v_order
  from orders
  where payment_reference = p_payment_reference
  for update;

  if not found then
    raise exception 'No order for payment reference %', p_payment_reference
      using errcode = 'no_data_found';
  end if;

  update orders
  set status = 'refunded', updated_at = now()
  where id = v_order.id;

  return jsonb_build_object('status', 'processed', 'order_id', v_order.id);
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table webhook_events enable row level security;
-- No anon policy: service role only.

revoke execute on function process_payment_success(text, text, text, text, integer)
  from anon, authenticated;
revoke execute on function process_payment_refund(text, text, text, text)
  from anon, authenticated;
