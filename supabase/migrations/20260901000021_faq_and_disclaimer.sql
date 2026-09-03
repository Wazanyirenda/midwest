-- FAQ entries and the research-use disclaimer.
--
-- Both are copy the owner rewords, not facts about how the system works, so
-- they live in the database rather than in a component. Hardcoding either
-- means a deploy every time a policy sentence changes.

-- ─── FAQ ─────────────────────────────────────────────────────────────────────

create table if not exists faq_items (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  position   integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_items_position_idx on faq_items (position);

alter table faq_items enable row level security;

-- Published entries render on a public page, same as the catalog. Writes stay
-- service-role, which RLS denies by default.
create policy "Public can read published FAQ items"
  on faq_items for select using (published);

-- Seeded only when the table is empty, so re-running never duplicates rows and
-- never overwrites wording the owner has since edited.
insert into faq_items (question, answer, position)
select * from (values
  (
    'What does "research use only" mean?',
    'Every product we sell is intended for laboratory research. It is not a drug, dietary supplement, or medical device, and none of it is approved for human or veterinary use. We do not provide preparation, reconstitution, dosage, or administration guidance of any kind.',
    0
  ),
  (
    'Do you provide a certificate of analysis?',
    'Yes. Every lot ships with a batch-specific certificate of analysis showing HPLC purity and mass spectrometry identity confirmation from an independent laboratory. Record the lot number in your methods and retain the documentation.',
    1
  ),
  (
    'What purity should I expect?',
    'Our specification is at least 98 percent by HPLC, and most lots test higher. Purity and identity are separate questions, so each lot is also checked by mass spectrometry to confirm the observed mass matches the theoretical mass.',
    2
  ),
  (
    'How should I store the material?',
    'Store lyophilized peptides cold and protected from light. Reconstituted material is far less stable than lyophilized powder. Our storage guide in the research library covers this in more detail.',
    3
  ),
  (
    'When will my order ship?',
    'Orders placed before 2:00 PM CT on a business day are processed the same day. Orders after that, or on weekends and holidays, are processed the next business day. You will get an email with tracking once the order ships. See our shipping policy for full details.',
    4
  ),
  (
    'Who is allowed to order?',
    'You must be at least 21 years old and acquiring these materials for lawful research purposes. Our terms of service set out the full eligibility requirements.',
    5
  )
) as seed(question, answer, position)
where not exists (select 1 from faq_items);

-- ─── Disclaimer ──────────────────────────────────────────────────────────────
-- Defaults are mirrored in lib/settings.ts so a missing row still renders a
-- complete disclaimer rather than an empty page.

insert into site_settings (key, value) values
  ('show_disclaimer_strip', 'true'::jsonb),
  (
    'disclaimer_body',
    to_jsonb($disclaimer$All products sold by Midwestern Peptides are intended strictly for laboratory research use. They are not designed or approved for human or animal consumption, and must not be used for any diagnostic, therapeutic, or medical application.

Midwestern Peptides does not provide instructions relating to preparation, reconstitution, administration, dosage, or any form of usage.

No product sold on this site is a drug, dietary supplement, or medical device, and none has been evaluated by the Food and Drug Administration for safety or efficacy.

All items are labeled "For Research Use Only — Not for Human or Veterinary Use."

By purchasing, you confirm that you are at least 21 years of age, that you are acquiring these materials for lawful research purposes, and that you are qualified to handle them safely. Any misuse, diversion, or resale for human consumption is prohibited and may violate federal, state, or international law.$disclaimer$::text)
  )
on conflict (key) do nothing;
