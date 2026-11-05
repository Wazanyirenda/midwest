-- BTCPay Server replaces NOWPayments for crypto checkout.
--
-- The provider check was declared inline, so Postgres named it; find it by its
-- definition instead of guessing the name. 'nowpayments' stays allowed so any
-- order created before the switch still satisfies the constraint.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.orders'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%payment_provider%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_payment_provider_check
  check (payment_provider in ('stripe', 'btcpay', 'nowpayments'));
