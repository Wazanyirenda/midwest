-- Tie carts to authenticated users so a cart follows the account across
-- devices; anonymous carts keep user_id null until sign-in merges them.

alter table carts add column user_id uuid;

create index carts_user_open_idx on carts (user_id) where completed_at is null;
