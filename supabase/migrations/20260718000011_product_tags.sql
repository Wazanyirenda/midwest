-- Marketing category tags so the home/footer category links can filter the
-- catalog. Slugs: healing, gh, glp1, recovery, nootropic, anti-aging, coa,
-- new, supplies.

alter table products add column tags text[] not null default '{}';

create index products_tags_idx on products using gin (tags);

update products set tags = array['coa'] where category = 'peptide';
update products set tags = array['supplies'] where category = 'equipment';

update products set tags = tags || '{healing}'
  where handle in ('bpc-157', 'tb-500', 'ghk-cu', 'kpv', 'thymosin-alpha-1');
update products set tags = tags || '{recovery}'
  where handle in ('bpc-157', 'tb-500', 'mots-c');
update products set tags = tags || '{gh}'
  where handle in ('aod-9604', 'cjc-1295-dac', 'ipamorelin', 'tesamorelin');
update products set tags = tags || '{glp1}'
  where handle in ('retatrutide');
update products set tags = tags || '{nootropic}'
  where handle in ('selank', 'semax');
update products set tags = tags || '{anti-aging}'
  where handle in ('nad-plus', 'ghk-cu', 'mots-c');
update products set tags = tags || '{new}'
  where handle in ('retatrutide', 'kpv', 'mots-c');
