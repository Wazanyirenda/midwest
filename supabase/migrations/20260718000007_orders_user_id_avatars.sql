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
