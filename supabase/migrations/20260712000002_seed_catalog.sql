-- Midwestern Peptides catalog, from the July 2026 menu PDF.
-- Inventory defaults to 100 per variant until real counts are provided.

create or replace function seed_product(
  p_title text,
  p_subtitle text,
  p_description text,
  p_handle text,
  p_category text,
  variants jsonb -- [{title, sku, price_cents}]
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

-- ─── Peptides ────────────────────────────────────────────────────────────────

select seed_product(
  'Lipo-C', 'Lipotropic Compound',
  'Lipo-C is a lipotropic compound blend. For research use only — not for human consumption.',
  'lipo-c', 'peptide',
  '[{"title": "10mg Vial", "sku": "LIPOC-10MG", "price_cents": 2000}]'
);

select seed_product(
  'NAD+', 'Nicotinamide Adenine Dinucleotide',
  'NAD+ is a coenzyme central to cellular energy metabolism studied in aging research. For research use only — not for human consumption.',
  'nad-plus', 'peptide',
  '[{"title": "500mg Vial", "sku": "NAD-500MG", "price_cents": 2000},
    {"title": "1000mg Vial", "sku": "NAD-1000MG", "price_cents": 4000}]'
);

select seed_product(
  'Retatrutide', 'Triple Receptor Agonist Peptide',
  'Retatrutide is an investigational GIP/GLP-1/glucagon triple receptor agonist peptide. For research use only — not for human consumption.',
  'retatrutide', 'peptide',
  '[{"title": "10mg Vial", "sku": "RETA-10MG", "price_cents": 4000},
    {"title": "20mg Vial", "sku": "RETA-20MG", "price_cents": 8000}]'
);

select seed_product(
  'AOD 9604', 'Modified GH Fragment 176-191',
  'AOD 9604 is a modified fragment of human growth hormone (176-191) studied in metabolic research. For research use only — not for human consumption.',
  'aod-9604', 'peptide',
  '[{"title": "5mg Vial", "sku": "AOD-5MG", "price_cents": 2000},
    {"title": "10mg Vial", "sku": "AOD-10MG", "price_cents": 4000}]'
);

select seed_product(
  'BPC-157', 'Body Protection Compound-157',
  'BPC-157 is a synthetic peptide consisting of 15 amino acids. For research use only — not for human consumption.',
  'bpc-157', 'peptide',
  '[{"title": "10mg Vial", "sku": "BPC157-10MG", "price_cents": 2000}]'
);

select seed_product(
  'CJC-1295 with DAC', 'GHRH Analog with Drug Affinity Complex',
  'CJC-1295 with DAC is a synthetic growth-hormone-releasing hormone analog. For research use only — not for human consumption.',
  'cjc-1295-dac', 'peptide',
  '[{"title": "5mg Vial", "sku": "CJC1295-5MG", "price_cents": 2000}]'
);

select seed_product(
  'GHK-Cu', 'Copper Tripeptide-1',
  'GHK-Cu is a naturally occurring copper-binding tripeptide studied in tissue and dermatological research. For research use only — not for human consumption.',
  'ghk-cu', 'peptide',
  '[{"title": "100mg Vial", "sku": "GHKCU-100MG", "price_cents": 2000}]'
);

select seed_product(
  'KPV', 'Alpha-MSH Tripeptide Fragment',
  'KPV is a tripeptide fragment of alpha-melanocyte-stimulating hormone studied in inflammation research. For research use only — not for human consumption.',
  'kpv', 'peptide',
  '[{"title": "10mg Vial", "sku": "KPV-10MG", "price_cents": 2000}]'
);

select seed_product(
  'TB-500', 'Thymosin Beta-4 Fragment',
  'TB-500 is a synthetic version of the naturally occurring peptide Thymosin Beta-4. For research use only — not for human consumption.',
  'tb-500', 'peptide',
  '[{"title": "10mg Vial", "sku": "TB500-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Ipamorelin', 'Selective GH Secretagogue',
  'Ipamorelin is a selective growth hormone secretagogue pentapeptide. For research use only — not for human consumption.',
  'ipamorelin', 'peptide',
  '[{"title": "10mg Vial", "sku": "IPAM-10MG", "price_cents": 2000}]'
);

select seed_product(
  'Tesamorelin', 'GHRH Analog',
  'Tesamorelin is a synthetic growth-hormone-releasing hormone analog. For research use only — not for human consumption.',
  'tesamorelin', 'peptide',
  '[{"title": "10mg Vial", "sku": "TESA-10MG", "price_cents": 4000}]'
);

select seed_product(
  'MOTS-C', 'Mitochondrial-Derived Peptide',
  'MOTS-C is a mitochondrial-derived peptide studied in metabolic and exercise physiology research. For research use only — not for human consumption.',
  'mots-c', 'peptide',
  '[{"title": "10mg Vial", "sku": "MOTSC-10MG", "price_cents": 2000},
    {"title": "20mg Vial", "sku": "MOTSC-20MG", "price_cents": 4000}]'
);

select seed_product(
  'Melanotan I', 'Alpha-MSH Analog (Afamelanotide)',
  'Melanotan I is a synthetic analog of alpha-melanocyte-stimulating hormone. For research use only — not for human consumption.',
  'melanotan-1', 'peptide',
  '[{"title": "10mg Vial", "sku": "MT1-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Melanotan II', 'Alpha-MSH Analog',
  'Melanotan II is a synthetic cyclic analog of alpha-melanocyte-stimulating hormone. For research use only — not for human consumption.',
  'melanotan-2', 'peptide',
  '[{"title": "10mg Vial", "sku": "MT2-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Selank', 'Synthetic Tuftsin Analog',
  'Selank is a synthetic heptapeptide analog of tuftsin studied in neurological research. For research use only — not for human consumption.',
  'selank', 'peptide',
  '[{"title": "10mg Vial", "sku": "SELANK-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Semax', 'ACTH Fragment Analog',
  'Semax is a synthetic peptide analog of ACTH(4-10) studied in neurological research. For research use only — not for human consumption.',
  'semax', 'peptide',
  '[{"title": "10mg Vial", "sku": "SEMAX-10MG", "price_cents": 4000}]'
);

select seed_product(
  'Thymosin Alpha-1', 'Immunomodulatory Peptide',
  'Thymosin Alpha-1 is a naturally occurring peptide studied in immunology research. For research use only — not for human consumption.',
  'thymosin-alpha-1', 'peptide',
  '[{"title": "10mg Vial", "sku": "TA1-10MG", "price_cents": 4000}]'
);

-- ─── Lab equipment & supplies ────────────────────────────────────────────────

select seed_product(
  '1" Luer Lock Needles with Cap', 'Laboratory Supplies',
  'One-inch Luer lock needles with protective caps. Sold in packs of 50.',
  'luer-lock-needles-1in', 'equipment',
  '[{"title": "50 Pack", "sku": "NEEDLE-1IN-50", "price_cents": 2000}]'
);

select seed_product(
  '3ml Luer Lock Tip Syringes', 'Laboratory Supplies',
  '3ml syringes with Luer lock tips. Sold in packs of 50.',
  'syringes-3ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-3ML-50", "price_cents": 2000}]'
);

select seed_product(
  '5ml Luer Lock Tip Syringes', 'Laboratory Supplies',
  '5ml syringes with Luer lock tips. Sold in packs of 50.',
  'syringes-5ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-5ML-50", "price_cents": 2000}]'
);

select seed_product(
  '31g 8mm 1ml Syringes', 'Laboratory Supplies',
  '31 gauge 5/16" (8mm) 1ml syringes. Sold in packs of 50.',
  'syringes-31g-1ml', 'equipment',
  '[{"title": "50 Pack", "sku": "SYR-31G-50", "price_cents": 2500}]'
);

select seed_product(
  'Alcohol Wipes', 'Laboratory Supplies',
  'Sterile isopropyl alcohol prep wipes, 200 count.',
  'alcohol-wipes-200', 'equipment',
  '[{"title": "200 Count", "sku": "WIPES-200", "price_cents": 500}]'
);

select seed_product(
  'Bacteriostatic Water 10ml', 'Laboratory Supplies',
  'Bacteriostatic water, 10ml vial. For laboratory reconstitution use.',
  'bac-water-10ml', 'equipment',
  '[{"title": "10ml Vial", "sku": "BACWATER-10ML", "price_cents": 500}]'
);

drop function seed_product(text, text, text, text, text, jsonb);
