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
