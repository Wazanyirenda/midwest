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
-- Midwestern Peptides catalog, from the July 2026 menu PDF.
-- Inventory defaults to 100 per variant until real counts are provided.

create or replace function seed_product(
  p_title text,
  p_subtitle text,
  p_description text,
  p_handle text,
  p_category text,
  variants jsonb -- [{title, sku, price_cents}]
) returns void language plpgsql as $$
declare
  pid uuid;
  v jsonb;
begin
  insert into products (title, subtitle, description, handle, category)
  values (p_title, p_subtitle, p_description, p_handle, p_category)
  returning id into pid;

  for v in select * from jsonb_array_elements(variants) loop
    insert into product_variants (product_id, title, sku, price_cents, inventory_quantity)
    values (pid, v->>'title', v->>'sku', (v->>'price_cents')::int, 100);
  end loop;
end;
$$;

-- ─── Peptides ────────────────────────────────────────────────────────────────

select seed_product(
  'Lipo-C', 'Lipotropic Compound',
  'Lipo-C is a lipotropic compound blend. For research use only — not for human consumption.',
  'lipo-c', 'peptide',
  '[{"title": "10mg Vial", "sku": "LIPOC-10MG", "price_cents": 2000}]'
);

select seed_product(
  'NAD+', 'Nicotinamide Adenine Dinucleotide',
  'NAD+ is a coenzyme central to cellular energy metabolism studied in aging research. For research use only — not for human consumption.',
  'nad-plus', 'peptide',
  '[{"title": "500mg Vial", "sku": "NAD-500MG", "price_cents": 2000},
    {"title": "1000mg Vial", "sku": "NAD-1000MG", "price_cents": 4000}]'
);

select seed_product(
  'Retatrutide', 'Triple Receptor Agonist Peptide',
  'Retatrutide is an investigational GIP/GLP-1/glucagon triple receptor agonist peptide. For research use only — not for human consumption.',
  'retatrutide', 'peptide',
  '[{"title": "10mg Vial", "sku": "RETA-10MG", "price_cents": 4000},
    {"title": "20mg Vial", "sku": "RETA-20MG", "price_cents": 8000}]'
);

select seed_product(
  'AOD 9604', 'Modified GH Fragment 176-191',
  'AOD 9604 is a modified fragment of human growth hormone (176-191) studied in metabolic research. For research use only — not for human consumption.',
  'aod-9604', 'peptide',
  '[{"title": "5mg Vial", "sku": "AOD-5MG", "price_cents": 2000},
    {"title": "10mg Vial", "sku": "AOD-10MG", "price_cents": 4000}]'
);

select seed_product(
  'BPC-157', 'Body Protection Compound-157',
  'BPC-157 is a synthetic peptide consisting of 15 amino acids. For research use only — not for human consumption.',
  'bpc-157', 'peptide',
  '[{"title": "10mg Vial", "sku": "BPC157-10MG", "price_cents": 2000}]'
);

select seed_product(
  'CJC-1295 with DAC', 'GHRH Analog with Drug Affinity Complex',
  'CJC-1295 with DAC is a synthetic growth-hormone-releasing hormone analog. For research use only — not for human consumption.',
  'cjc-1295-dac', 'peptide',
  '[{"title": "5mg Vial", "sku": "CJC1295-5MG", "price_cents": 2000}]'
);

select seed_product(
  'GHK-Cu', 'Copper Tripeptide-1',
  'GHK-Cu is a naturally occurring copper-binding tripeptide studied in tissue and dermatological research. For research use only — not for human consumption.',
  'ghk-cu', 'peptide',
  '[{"title": "100mg Vial", "sku": "GHKCU-100MG", "price_cents": 2000}]'
);

select seed_product(
  'KPV', 'Alpha-MSH Tripeptide Fragment',
  'KPV is a tripeptide fragment of alpha-melanocyte-stimulating hormone studied in inflammation research. For research use only — not for human consumption.',
  'kpv', 'peptide',
  '[{"title": "10mg Vial", "sku": "KPV-10MG", "price_cents": 2000}]'
);

select seed_product(
  'TB-500', 'Thymosin Beta-4 Fragment',
  'TB-500 is a synthetic version of the naturally occurring peptide Thymosin Beta-4. For research use only — not for human consumption.',
  'tb-500', 'peptide',
  '[{"title": "10mg Vial", "sku": "TB500-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Ipamorelin', 'Selective GH Secretagogue',
  'Ipamorelin is a selective growth hormone secretagogue pentapeptide. For research use only — not for human consumption.',
  'ipamorelin', 'peptide',
  '[{"title": "10mg Vial", "sku": "IPAM-10MG", "price_cents": 2000}]'
);

select seed_product(
  'Tesamorelin', 'GHRH Analog',
  'Tesamorelin is a synthetic growth-hormone-releasing hormone analog. For research use only — not for human consumption.',
  'tesamorelin', 'peptide',
  '[{"title": "10mg Vial", "sku": "TESA-10MG", "price_cents": 4000}]'
);

select seed_product(
  'MOTS-C', 'Mitochondrial-Derived Peptide',
  'MOTS-C is a mitochondrial-derived peptide studied in metabolic and exercise physiology research. For research use only — not for human consumption.',
  'mots-c', 'peptide',
  '[{"title": "10mg Vial", "sku": "MOTSC-10MG", "price_cents": 2000},
    {"title": "20mg Vial", "sku": "MOTSC-20MG", "price_cents": 4000}]'
);

select seed_product(
  'Melanotan I', 'Alpha-MSH Analog (Afamelanotide)',
  'Melanotan I is a synthetic analog of alpha-melanocyte-stimulating hormone. For research use only — not for human consumption.',
  'melanotan-1', 'peptide',
  '[{"title": "10mg Vial", "sku": "MT1-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Melanotan II', 'Alpha-MSH Analog',
  'Melanotan II is a synthetic cyclic analog of alpha-melanocyte-stimulating hormone. For research use only — not for human consumption.',
  'melanotan-2', 'peptide',
  '[{"title": "10mg Vial", "sku": "MT2-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Selank', 'Synthetic Tuftsin Analog',
  'Selank is a synthetic heptapeptide analog of tuftsin studied in neurological research. For research use only — not for human consumption.',
  'selank', 'peptide',
  '[{"title": "10mg Vial", "sku": "SELANK-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Semax', 'ACTH Fragment Analog',
  'Semax is a synthetic peptide analog of ACTH(4-10) studied in neurological research. For research use only — not for human consumption.',
  'semax', 'peptide',
  '[{"title": "10mg Vial", "sku": "SEMAX-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Thymosin Alpha-1', 'Immunomodulatory Peptide',
  'Thymosin Alpha-1 is a naturally occurring peptide studied in immunology research. For research use only — not for human consumption.',
  'thymosin-alpha-1', 'peptide',
  '[{"title": "10mg Vial", "sku": "TA1-10MG", "price_cents": 4000}]'
);

-- ─── Lab equipment & supplies ────────────────────────────────────────────────

select seed_product(
  '1" Luer Lock Needles with Cap', 'Laboratory Supplies',
  'One-inch Luer lock needles with protective caps. Sold in packs of 50.',
  'luer-lock-needles-1in', 'equipment',
  '[{"title": "50 Pack", "sku": "NEEDLE-1IN-50", "price_cents": 2000}]'
);

select seed_product(
  '3ml Luer Lock Tip Syringes', 'Laboratory Supplies',
  '3ml syringes with Luer lock tips. Sold in packs of 50.',
  'syringes-3ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-3ML-50", "price_cents": 2000}]'
);

select seed_product(
  '5ml Luer Lock Tip Syringes', 'Laboratory Supplies',
  '5ml syringes with Luer lock tips. Sold in packs of 50.',
  'syringes-5ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-5ML-50", "price_cents": 2000}]'
);

select seed_product(
  '31g 8mm 1ml Syringes', 'Laboratory Supplies',
  '31 gauge 5/16" (8mm) 1ml syringes. Sold in packs of 50.',
  'syringes-31g-1ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-31G-50", "price_cents": 2500}]'
);

select seed_product(
  'Alcohol Wipes', 'Laboratory Supplies',
  'Sterile isopropyl alcohol prep wipes, 200 count.',
  'alcohol-wipes-200', 'equipment',
  '[{"title": "200 Count", "sku": "WIPES-200", "price_cents": 500}]'
);

select seed_product(
  'Bacteriostatic Water 10ml', 'Laboratory Supplies',
  'Bacteriostatic water, 10ml vial. For laboratory reconstitution use.',
  'bac-water-10ml', 'equipment',
  '[{"title": "10ml Vial", "sku": "BACWATER-10ML", "price_cents": 500}]'
);

drop function seed_product(text, text, text, text, text, jsonb);
-- Public bucket for product images; products.thumbnail stores the public URL.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
-- Atomically decrement variant inventory when an order is placed.
-- items: [{"variant_id": "...", "quantity": 2}, ...]
create or replace function decrement_inventory(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(items) loop
    update product_variants
    set inventory_quantity = greatest(0, inventory_quantity - (item->>'quantity')::int)
    where id = (item->>'variant_id')::uuid;
  end loop;
end;
$$;

revoke execute on function decrement_inventory(jsonb) from anon, authenticated;

-- ═══ Account management: profiles, addresses, wishlists, tags, newsletter ═══

-- Customer profiles, one row per auth.users row.
-- Created automatically by the on_auth_user_created trigger on signup.

create table profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  first_name             text,
  last_name              text,
  phone                  text,
  avatar_url             text,
  marketing_email_opt_in boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table profiles enable row level security;

-- Own-row access only; the storefront's service-role client bypasses RLS,
-- these policies are defense-in-depth for any future anon/authenticated access.
create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Populate a profile row from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, marketing_email_opt_in)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce((new.raw_user_meta_data ->> 'marketing_email_opt_in')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- Link orders to authenticated users (nullable: guest checkout stays possible)
-- and create the avatars storage bucket for profile pictures.

alter table orders
  add column user_id uuid references auth.users (id) on delete set null;

create index orders_user_id_idx on orders (user_id);

-- Avatars: public bucket, uploads go through a server action with the
-- service-role key; 2 MB limit, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Backfill: run MANUALLY once real users have re-registered post-auth-cutover.
-- update orders o
-- set user_id = u.id
-- from auth.users u
-- where o.user_id is null and lower(o.email) = lower(u.email);

-- Shipment tracking + customer cancellation requests.

alter table orders
  add column tracking_number text,
  add column tracking_carrier text check (tracking_carrier in ('usps', 'ups', 'fedex', 'dhl')),
  add column cancellation_requested_at timestamptz;

-- Tie carts to authenticated users so a cart follows the account across
-- devices; anonymous carts keep user_id null until sign-in merges them.

alter table carts add column user_id uuid;

create index carts_user_open_idx on carts (user_id) where completed_at is null;

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

-- Marketing category tags so the home/footer category links can filter the
-- catalog. Slugs: healing, gh, glp1, recovery, nootropic, anti-aging, coa,
-- new, supplies.

alter table products add column tags text[] not null default '{}';

create index products_tags_idx on products using gin (tags);

update products set tags = array['coa'] where category = 'peptide';
update products set tags = array['supplies'] where category = 'equipment';

update products set tags = tags || '{healing}'
  where handle in ('bpc-157', 'tb-500', 'ghk-cu', 'kpv', 'thymosin-alpha-1');
update products set tags = tags || '{recovery}'
  where handle in ('bpc-157', 'tb-500', 'mots-c');
update products set tags = tags || '{gh}'
  where handle in ('aod-9604', 'cjc-1295-dac', 'ipamorelin', 'tesamorelin');
update products set tags = tags || '{glp1}'
  where handle in ('retatrutide');
update products set tags = tags || '{nootropic}'
  where handle in ('selank', 'semax');
update products set tags = tags || '{anti-aging}'
  where handle in ('nad-plus', 'ghk-cu', 'mots-c');
update products set tags = tags || '{new}'
  where handle in ('retatrutide', 'kpv', 'mots-c');

-- Newsletter signups from the homepage form.

create table newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table newsletter_subscribers enable row level security;

-- ═══ Google OAuth: profile metadata from OAuth providers ═══
-- Teach the signup trigger to read OAuth metadata as well as email-signup
-- metadata. Google returns given_name/family_name/full_name/name + avatar_url
-- or picture, where our own form sends first_name/last_name.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
begin
  insert into public.profiles (id, first_name, last_name, avatar_url, marketing_email_opt_in)
  values (
    new.id,
    nullif(coalesce(
      meta ->> 'first_name',
      meta ->> 'given_name',
      split_part(display_name, ' ', 1)
    ), ''),
    nullif(coalesce(
      meta ->> 'last_name',
      meta ->> 'family_name',
      nullif(substring(display_name from position(' ' in display_name) + 1), display_name)
    ), ''),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), ''),
    coalesce((meta ->> 'marketing_email_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
