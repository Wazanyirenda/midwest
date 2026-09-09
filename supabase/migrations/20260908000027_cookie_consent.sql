-- Cookie consent banner.
--
-- Default ON: with the banner off there is no way for a visitor to accept, so
-- analytics never loads and no analytics cookie is ever written. Off is the
-- quieter page but also the one that collects nothing — the owner should make
-- that trade deliberately rather than inherit it from a failed settings read.

insert into site_settings (key, value) values
  ('show_cookie_banner', 'true'::jsonb)
on conflict (key) do nothing;
