-- Core commerce schema: products, variants, carts, orders.
-- All access goes through the Next.js server using the service-role key,
-- so RLS is enabled with no anon policies (deny-by-default).

create extension if not exists "pgcrypto";

-- ─── Products ────────────────────────────────────────────────────────────────

create table products (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  description text,
  handle      text not null unique,
  thumbnail   text,
  category    text not null default 'peptide' check (category in ('peptide', 'equipment')),
  status      text not null default 'published' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table product_variants (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products (id) on delete cascade,
  title              text not null,
  sku                text not null unique,
  price_cents        integer not null check (price_cents >= 0),
  currency_code      text not null default 'usd',
  inventory_quantity integer not null default 0,
  created_at         timestamptz not null default now()
);

create index product_variants_product_id_idx on product_variants (product_id);

-- ─── Carts ───────────────────────────────────────────────────────────────────

create table carts (
  id               uuid primary key default gen_random_uuid(),
  email            text,
  shipping_address jsonb,
  shipping_cents   integer,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create index cart_items_cart_id_idx on cart_items (cart_id);

-- ─── Orders ──────────────────────────────────────────────────────────────────

create table orders (
  id                uuid primary key default gen_random_uuid(),
  display_id        serial unique,
  cart_id           uuid references carts (id),
  email             text not null,
  shipping_address  jsonb,
  subtotal_cents    integer not null,
  shipping_cents    integer not null default 0,
  total_cents       integer not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'paid', 'shipped', 'delivered', 'canceled')),
  payment_provider  text check (payment_provider in ('stripe', 'nowpayments')),
  payment_reference text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_email_idx on orders (email);

create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders (id) on delete cascade,
  variant_id       uuid references product_variants (id) on delete set null,
  product_title    text not null,
  variant_title    text,
  quantity         integer not null,
  unit_price_cents integer not null
);

create index order_items_order_id_idx on order_items (order_id);

-- ─── RLS: deny-by-default, service role bypasses ─────────────────────────────

alter table products         enable row level security;
alter table product_variants enable row level security;
alter table carts            enable row level security;
alter table cart_items       enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;

-- The catalog is public data; allow anonymous reads of published products
-- in case the storefront ever queries with the anon key.
create policy "Public can read published products"
  on products for select using (status = 'published');

create policy "Public can read variants of published products"
  on product_variants for select using (
    exists (
      select 1 from products p
      where p.id = product_variants.product_id and p.status = 'published'
    )
  );
