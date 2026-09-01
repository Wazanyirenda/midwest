-- Rebrand the Retatrutide listing as "GLP-3".
-- Handle changes too, so /products/retatrutide becomes /products/glp-3.

update products
set    title       = 'GLP-3',
       handle      = 'glp-3',
       description = 'GLP-3 is an investigational GIP/GLP-1/glucagon triple receptor agonist peptide. For research use only — not for human consumption.',
       updated_at  = now()
where  handle = 'retatrutide';

update product_variants
set    sku = replace(sku, 'RETA-', 'GLP3-')
where  product_id in (select id from products where handle = 'glp-3')
  and  sku like 'RETA-%';
