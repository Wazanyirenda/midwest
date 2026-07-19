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
