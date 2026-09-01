-- Admin dashboard rebuild: product image galleries, per-variant reorder points,
-- and an audit trail for stock changes.
--
-- Follows the deny-by-default RLS convention from the commerce schema: the
-- Next.js server uses the service-role key, anon gets read-only access to
-- published catalog data and nothing else.

-- ─── Product images ──────────────────────────────────────────────────────────
-- products.thumbnail stays as the denormalised primary image so every existing
-- storefront query keeps working; this table is the source of truth and a
-- trigger keeps thumbnail in sync.

create table product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products (id) on delete cascade,
  url          text not null,
  storage_path text,
  alt          text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index product_images_product_id_idx on product_images (product_id, position);

-- Backfill from the single thumbnail column so nothing is lost.
insert into product_images (product_id, url, position)
select id, thumbnail, 0
from products
where thumbnail is not null and thumbnail <> '';

-- Keep products.thumbnail pointing at position 0 of the gallery.
create or replace function sync_product_thumbnail() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target_product uuid := coalesce(new.product_id, old.product_id);
begin
  update products
  set thumbnail = (
        select url from product_images
        where product_id = target_product
        order by position, created_at
        limit 1
      ),
      updated_at = now()
  where id = target_product;
  return null;
end;
$$;

create trigger product_images_sync_thumbnail
after insert or update or delete on product_images
for each row execute function sync_product_thumbnail();

-- ─── Per-variant reorder points ──────────────────────────────────────────────
-- Replaces the hardcoded LOW_STOCK_THRESHOLD = 10 in the admin overview so a
-- $400 peptide and an $8 syringe can alert at different levels.

alter table product_variants
  add column reorder_point integer not null default 10 check (reorder_point >= 0);

-- ─── Inventory adjustments ───────────────────────────────────────────────────
-- Every stock change writes a row here, so "where did those 40 vials go" has an
-- answer. delta is signed: negative for sales/shrinkage, positive for restock.

create table inventory_adjustments (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants (id) on delete cascade,
  delta       integer not null,
  resulting_quantity integer not null,
  reason      text not null default 'manual'
              check (reason in ('manual', 'restock', 'sale', 'correction', 'shrinkage')),
  note        text,
  actor_email text,
  created_at  timestamptz not null default now()
);

create index inventory_adjustments_variant_id_idx
  on inventory_adjustments (variant_id, created_at desc);
create index inventory_adjustments_created_at_idx
  on inventory_adjustments (created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table product_images         enable row level security;
alter table inventory_adjustments  enable row level security;

-- Gallery images for published products are public data, same as the catalog.
create policy "Public can read images of published products"
  on product_images for select using (
    exists (
      select 1 from products p
      where p.id = product_images.product_id and p.status = 'published'
    )
  );

-- inventory_adjustments gets no anon policy: service role only.

-- ─── Sales write to the audit trail too ──────────────────────────────────────
-- Without this, stock silently drops on checkout and the adjustment history
-- can't explain where the units went.

create or replace function decrement_inventory(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  qty  int;
  remaining int;
begin
  for item in select * from jsonb_array_elements(items) loop
    qty := (item->>'quantity')::int;

    update product_variants
    set inventory_quantity = greatest(0, inventory_quantity - qty)
    where id = (item->>'variant_id')::uuid
    returning inventory_quantity into remaining;

    if found then
      insert into inventory_adjustments
        (variant_id, delta, resulting_quantity, reason, note)
      values
        ((item->>'variant_id')::uuid, -qty, remaining, 'sale', 'Order placed');
    end if;
  end loop;
end;
$$;

revoke execute on function decrement_inventory(jsonb) from anon, authenticated;
