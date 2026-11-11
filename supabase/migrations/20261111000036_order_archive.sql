-- Archiving hides finished orders (canceled, delivered, refunded) from the
-- admin order list without deleting them: the record of a sale, a refund or a
-- cancellation has to outlive the clutter. Restoring clears the timestamp.

alter table orders add column if not exists archived_at timestamptz;

create index if not exists orders_archived_at_idx
  on orders (archived_at)
  where archived_at is not null;
