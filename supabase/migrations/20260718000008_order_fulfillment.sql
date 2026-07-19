-- Shipment tracking + customer cancellation requests.

alter table orders
  add column tracking_number text,
  add column tracking_carrier text check (tracking_carrier in ('usps', 'ups', 'fedex', 'dhl')),
  add column cancellation_requested_at timestamptz;
