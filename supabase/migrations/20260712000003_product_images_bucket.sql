-- Public bucket for product images; products.thumbnail stores the public URL.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
