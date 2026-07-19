-- Wishlist / saved-for-later. One wishlist per user; items keyed by product
-- with an optional exact variant (set when saving a cart line for later).

create table wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at  timestamptz not null default now()
);

create table wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references wishlists (id) on delete cascade,
  product_id  uuid not null references products (id) on delete cascade,
  variant_id  uuid references product_variants (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create index wishlist_items_wishlist_id_idx on wishlist_items (wishlist_id);

alter table wishlists enable row level security;
alter table wishlist_items enable row level security;
