// Uploads product images to Supabase Storage and links them to products.
//
// Usage:  node scripts/import-product-images.mjs <folder-with-images>
//
// Images are matched to products by normalized filename, e.g.
// "BPC 157.png", "bpc-157.jpg", "BPC157.webp" all match the bpc-157 product.
// Unmatched files are listed at the end so you can rename and re-run.

import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "node:fs"
import { join, extname, basename } from "node:path"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  // Load .env.local when run outside next
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] ??= m[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
}

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

const folder = process.argv[2]
if (!folder) {
  console.error("Usage: node scripts/import-product-images.mjs <folder-with-images>")
  process.exit(1)
}

const { data: products, error } = await supabase
  .from("products")
  .select("id,title,handle")
if (error) throw new Error(error.message)

const files = readdirSync(folder).filter((f) => CONTENT_TYPES[extname(f).toLowerCase()])
if (!files.length) {
  console.error(`No image files found in ${folder}`)
  process.exit(1)
}

const unmatched = []
for (const file of files) {
  const ext = extname(file).toLowerCase()
  const stem = normalize(basename(file, extname(file)))
  const product = products.find(
    (p) =>
      normalize(p.handle) === stem ||
      normalize(p.title) === stem ||
      stem.includes(normalize(p.handle)) ||
      normalize(p.handle).includes(stem)
  )
  if (!product) {
    unmatched.push(file)
    continue
  }

  const storagePath = `${product.handle}${ext}`
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(storagePath, readFileSync(join(folder, file)), {
      contentType: CONTENT_TYPES[ext],
      upsert: true,
    })
  if (uploadError) {
    console.error(`✗ ${file}: upload failed — ${uploadError.message}`)
    continue
  }

  const { data: pub } = supabase.storage.from("product-images").getPublicUrl(storagePath)
  await supabase.from("products").update({ thumbnail: pub.publicUrl }).eq("id", product.id)
  console.log(`✓ ${file} → ${product.title}`)
}

if (unmatched.length) {
  console.log("\nCould not match these files to a product (rename and re-run):")
  unmatched.forEach((f) => console.log(`  - ${f}`))
  console.log("\nProduct handles:", products.map((p) => p.handle).join(", "))
}
