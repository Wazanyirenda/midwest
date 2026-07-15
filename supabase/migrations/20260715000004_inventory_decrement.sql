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
