-- Manual crypto payments: the customer pays BTC, USDT or USDC straight to the
-- store's wallet, pastes the transaction ID, and staff approve the order by
-- hand. No processor, no BTCPay server.
--
-- Also gives every order a short public code (MW-7K3Q9P) in place of the
-- sequential #1042, which told anyone how many orders the store had taken and
-- let a customer guess other people's order numbers.

-- ─── Order codes ─────────────────────────────────────────────────────────────
-- Characters people misread are left out (0/O, 1/I/L, 5/S, 8/B), so a code
-- read over the phone or typed into a wallet memo comes out right.

create or replace function generate_order_code() returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ACDEFGHJKMNPQRTUVWXYZ234679';
  code text;
  i int;
begin
  loop
    code := 'MW-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from orders where order_code = code);
  end loop;
  return code;
end;
$$;

alter table orders add column if not exists order_code text;

update orders set order_code = generate_order_code() where order_code is null;

alter table orders alter column order_code set default generate_order_code();
alter table orders alter column order_code set not null;
create unique index if not exists orders_order_code_key on orders (order_code);

-- ─── Manual payment details ─────────────────────────────────────────────────
-- What the customer was told to pay, snapshotted on the order: if the wallet
-- address in settings changes later, the order still records where this
-- customer was sent.

alter table orders
  add column if not exists payment_asset         text,
  add column if not exists payment_network       text,
  add column if not exists payment_address       text,
  add column if not exists payment_amount_crypto numeric(20, 8),
  add column if not exists payment_quoted_at     timestamptz,
  add column if not exists payment_txid          text,
  add column if not exists payment_submitted_at  timestamptz,
  add column if not exists approved_at           timestamptz,
  add column if not exists approved_by           uuid references auth.users (id) on delete set null,
  add column if not exists cancel_reason         text;

-- One blockchain transaction pays for one order. Without this a customer could
-- claim someone else's payment, or the same payment twice.
create unique index if not exists orders_payment_txid_key
  on orders (lower(payment_txid))
  where payment_txid is not null;

-- The approval queue and the unpaid-order sweep both read pending manual orders.
create index if not exists orders_manual_pending_idx
  on orders (created_at)
  where status = 'pending' and payment_provider = 'manual';

-- ─── Provider ────────────────────────────────────────────────────────────────

alter table orders drop constraint if exists orders_payment_provider_check;
alter table orders
  add constraint orders_payment_provider_check
  check (payment_provider in ('stripe', 'btcpay', 'nowpayments', 'manual'));

-- ─── Settings ────────────────────────────────────────────────────────────────
-- Off, with no addresses: nothing is offered until the owner has entered a
-- wallet address and switched it on.

insert into site_settings (key, value) values
  ('manual_payments_enabled',   'false'::jsonb),
  ('payment_address_btc',       '""'::jsonb),
  ('payment_address_usdt',      '""'::jsonb),
  ('payment_network_usdt',      '"ethereum"'::jsonb),
  ('payment_address_usdc',      '""'::jsonb),
  ('payment_network_usdc',      '"ethereum"'::jsonb),
  ('btc_quote_minutes',         '60'::jsonb),
  ('unpaid_order_cancel_hours', '48'::jsonb),
  ('order_alert_emails',        '"orders@midwesternpeptides.com, support@midwesternpeptides.com"'::jsonb),
  ('email_order_received_subject', '"Order {{order_number}} received - payment instructions"'::jsonb),
  ('email_order_received_heading', '"Thanks - here''s how to pay"'::jsonb),
  ('email_order_received_body',
   '"We have received order {{order_number}}. To complete it, send the exact amount below to our wallet.\n\nOnce you have paid, open your order and paste your transaction ID so we can match the payment to your order. We check payments by hand and will email you as soon as yours is approved.\n\nUnpaid orders are canceled automatically after {{cancel_hours}} hours."'::jsonb)
on conflict (key) do nothing;
