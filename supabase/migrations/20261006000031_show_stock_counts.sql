-- Whether cart and checkout lines state the remaining unit count outright
-- ("15 left in stock"), rather than staying quiet until stock runs low.
--
-- Separate from low_stock_threshold, which now only decides when that count is
-- styled as urgent. On by default: the number is read live from inventory, so
-- it tells the customer something true before they pay.
insert into site_settings (key, value) values
  ('show_stock_counts', 'true'::jsonb)
on conflict (key) do nothing;
