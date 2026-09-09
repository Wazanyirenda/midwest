-- Owner-editable copy for the four customer emails.
--
-- Subject, heading and body only. The surrounding HTML shell, the itemised
-- order table and the buttons stay in code: the owner needs to reword mail
-- without a deploy (AGENTS.md §2), but hand-edited HTML in a settings row
-- would reach a customer's inbox unreviewed. Everything stored here is escaped
-- before it is rendered.
--
-- {{order_number}} and {{customer_name}} are substituted where they make sense.

insert into site_settings (key, value) values
  ('email_welcome_subject',  '"Welcome to Midwestern Peptides"'::jsonb),
  ('email_welcome_heading',  '"Your account is ready"'::jsonb),
  ('email_welcome_body',     '"Thanks for creating an account. You can now track orders, save addresses, and request a certificate of analysis for any lot you buy.\n\nWe never send your password by email. If you ever need to change it, use the reset link on the sign-in page."'::jsonb),

  ('email_order_confirmation_subject', '"Order {{order_number}} confirmed"'::jsonb),
  ('email_order_confirmation_heading', '"Order {{order_number}} confirmed"'::jsonb),
  ('email_order_confirmation_body',    '"Thanks for your order. We have received it and will start preparing it right away, and you will get another email with tracking once it ships.\n\nYour receipt is attached to this email as a PDF."'::jsonb),

  ('email_order_shipped_subject', '"Your order {{order_number}} is on its way"'::jsonb),
  ('email_order_shipped_heading', '"Your order has shipped"'::jsonb),
  ('email_order_shipped_body',    '"Good news - your order is on its way. Tracking details are below where available."'::jsonb),

  ('email_abandoned_cart_subject', '"You left something in your cart"'::jsonb),
  ('email_abandoned_cart_heading', '"Still thinking it over?"'::jsonb),
  ('email_abandoned_cart_body',    '"Your cart is still saved. Stock moves quickly on popular compounds, so we wanted to let you know before it sells out."'::jsonb)
on conflict (key) do nothing;
