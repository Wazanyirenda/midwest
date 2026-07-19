-- Saved customer addresses. Column names deliberately mirror the snake_case
-- keys used in carts/orders shipping_address jsonb (updateCartContact).

create table addresses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  label               text,
  first_name          text not null,
  last_name           text not null,
  phone               text,
  address_1           text not null,
  address_2           text,
  city                text not null,
  province            text not null,
  postal_code         text not null,
  country_code        text not null default 'us',
  is_default_shipping boolean not null default false,
  is_default_billing  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index addresses_user_id_idx on addresses (user_id);

-- At most one default shipping / billing address per user.
create unique index addresses_one_default_shipping
  on addresses (user_id) where is_default_shipping;
create unique index addresses_one_default_billing
  on addresses (user_id) where is_default_billing;

alter table addresses enable row level security;

create policy "Users can read own addresses"
  on addresses for select using (auth.uid() = user_id);
create policy "Users can insert own addresses"
  on addresses for insert with check (auth.uid() = user_id);
create policy "Users can update own addresses"
  on addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own addresses"
  on addresses for delete using (auth.uid() = user_id);
