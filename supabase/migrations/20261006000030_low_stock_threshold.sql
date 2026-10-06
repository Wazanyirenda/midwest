-- How much stock is left before the cart and checkout tell the customer the
-- remaining count. A merchandising decision the owner owns, not a constant:
-- too high and every line nags, too low and nobody sees the last few units.
--
-- 0 turns the counts off entirely. Out of stock is always shown regardless,
-- because it blocks the order.
insert into site_settings (key, value) values
  ('low_stock_threshold', '10'::jsonb)
on conflict (key) do nothing;
