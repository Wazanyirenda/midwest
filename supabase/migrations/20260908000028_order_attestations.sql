-- Buyer attestations recorded on the order.
--
-- The 21+ confirmation and the terms acceptance were previously collected by a
-- checkbox in the browser and then discarded: the value never reached a server
-- action, so the restriction was unenforced and no evidence survived that any
-- buyer had agreed to anything. Both are now required arguments to
-- initiatePaymentSession and are stamped here at the moment the order is
-- created.
--
-- Nullable because orders placed before this migration have no attestation, and
-- backfilling one would be inventing a record that was never made.

alter table orders
  add column if not exists age_confirmed_at   timestamptz,
  add column if not exists terms_accepted_at  timestamptz;

comment on column orders.age_confirmed_at is
  'When the buyer confirmed they are 21+. Null for orders predating the check.';
comment on column orders.terms_accepted_at is
  'When the buyer accepted the terms, privacy policy and research-use disclaimer.';
