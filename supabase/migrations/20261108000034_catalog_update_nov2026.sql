-- November 2026 catalog refresh.
-- • Revert the GLP-3 rename back to Retatrutide, add 30/40/50 mg variants,
--   and fix the 20 mg price.
-- • Update CJC-1295 with DAC to 10 mg / $40.
-- • Add seven new peptides.
-- • Delete every equipment-category product (needles, syringes, wipes, bac water).

-- ─── 1. Remove equipment ────────────────────────────────────────────────────

-- Cascade deletes variants, cart_items and order_items (FK on delete cascade / set null).
delete from products where category = 'equipment';

-- ─── 2. Retatrutide (currently "GLP-3") ─────────────────────────────────────

update products
set    title       = 'Retatrutide',
       subtitle    = 'Triple Receptor Agonist Peptide',
       handle      = 'retatrutide',
       description = 'Retatrutide is an investigational GIP/GLP-1/glucagon triple receptor agonist peptide. For research use only — not for human consumption.',
       updated_at  = now()
where  handle = 'glp-3';

-- Fix 20 mg price: was 8000, now 6000
update product_variants
set    price_cents = 6000,
       sku         = 'RETA-20MG'
where  product_id in (select id from products where handle = 'retatrutide')
  and  title = '20mg Vial';

-- Fix 10 mg SKU back
update product_variants
set    sku = 'RETA-10MG'
where  product_id in (select id from products where handle = 'retatrutide')
  and  title = '10mg Vial';

-- Add 30/40/50 mg variants
insert into product_variants (product_id, title, sku, price_cents, inventory_quantity)
select id, '30mg Vial', 'RETA-30MG', 8000, 100 from products where handle = 'retatrutide'
union all
select id, '40mg Vial', 'RETA-40MG', 10000, 100 from products where handle = 'retatrutide'
union all
select id, '50mg Vial', 'RETA-50MG', 12000, 100 from products where handle = 'retatrutide';

-- ─── 3. CJC-1295 with DAC: 5 mg → 10 mg, $20 → $40 ───────────────────────

update product_variants
set    title       = '10mg Vial',
       sku         = 'CJC1295DAC-10MG',
       price_cents = 4000
where  product_id in (select id from products where handle = 'cjc-1295-dac')
  and  sku = 'CJC1295-5MG';

-- ─── 4. New peptides ────────────────────────────────────────────────────────

-- Re-create the helper so we can use it.
create or replace function seed_product(
  p_title text,
  p_subtitle text,
  p_description text,
  p_handle text,
  p_category text,
  variants jsonb
) returns void language plpgsql as $$
declare
  pid uuid;
  v jsonb;
begin
  insert into products (title, subtitle, description, handle, category)
  values (p_title, p_subtitle, p_description, p_handle, p_category)
  returning id into pid;
  for v in select * from jsonb_array_elements(variants) loop
    insert into product_variants (product_id, title, sku, price_cents, inventory_quantity)
    values (pid, v->>'title', v->>'sku', (v->>'price_cents')::int, 100);
  end loop;
end;
$$;

select seed_product(
  '5-Amino-1MQ', 'Methylquinolinium Peptide',
  '5-Amino-1MQ is a small-molecule inhibitor of NNMT studied in metabolic research. For research use only — not for human consumption.',
  '5-amino-1mq', 'peptide',
  '[{"title": "10mg Vial", "sku": "5A1MQ-10MG", "price_cents": 4000}]'
);

select seed_product(
  'PT-141', 'Bremelanotide',
  'PT-141 (Bremelanotide) is a synthetic peptide analog of alpha-melanocyte-stimulating hormone. For research use only — not for human consumption.',
  'pt-141', 'peptide',
  '[{"title": "10mg Vial", "sku": "PT141-10MG", "price_cents": 4000}]'
);

select seed_product(
  'SS31', 'Elamipretide',
  'SS31 (Elamipretide) is a mitochondria-targeted tetrapeptide studied in cellular energy metabolism research. For research use only — not for human consumption.',
  'ss31', 'peptide',
  '[{"title": "50mg Vial", "sku": "SS31-50MG", "price_cents": 4000}]'
);

select seed_product(
  'Epithalon', 'Epithalamin Tetrapeptide',
  'Epithalon (Epithalamin) is a synthetic tetrapeptide studied in telomere and aging research. For research use only — not for human consumption.',
  'epithalon', 'peptide',
  '[{"title": "50mg Vial", "sku": "EPITH-50MG", "price_cents": 4000}]'
);

select seed_product(
  'IGF-1 LR3', 'Long R3 Insulin-like Growth Factor-1',
  'IGF-1 LR3 is a modified form of IGF-1 with an extended half-life, studied in growth factor research. For research use only — not for human consumption.',
  'igf-1-lr3', 'peptide',
  '[{"title": "1mg Vial", "sku": "IGF1LR3-1MG", "price_cents": 4000}]'
);

select seed_product(
  'HGH 191AA', 'Somatropin 191 Amino Acid',
  'HGH 191AA is a synthetic 191-amino-acid growth hormone studied in endocrine research. For research use only — not for human consumption.',
  'hgh-191aa', 'peptide',
  '[{"title": "15IU Vial", "sku": "HGH191-15IU", "price_cents": 4000}]'
);

select seed_product(
  'CJC-1295 Without DAC', 'GHRH Analog (Mod GRF 1-29)',
  'CJC-1295 without DAC (Mod GRF 1-29) is a synthetic growth-hormone-releasing hormone analog with a shorter half-life. For research use only — not for human consumption.',
  'cjc-1295-no-dac', 'peptide',
  '[{"title": "5mg Vial",  "sku": "CJC1295ND-5MG",  "price_cents": 3000},
    {"title": "10mg Vial", "sku": "CJC1295ND-10MG", "price_cents": 4000}]'
);

drop function seed_product(text, text, text, text, text, jsonb);
