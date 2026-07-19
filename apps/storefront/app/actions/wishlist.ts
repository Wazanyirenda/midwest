"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getUser, requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getOrCreateWishlist } from "@/lib/wishlist"
import { getOrCreateCartId } from "./cart"

function revalidateWishlistPaths() {
  revalidatePath("/products")
  revalidatePath("/account/wishlist")
  revalidatePath("/", "layout")
}

export async function toggleWishlist(productId: string): Promise<{ added: boolean }> {
  const user = await getUser()
  if (!user) redirect("/sign-in?next=/products")

  const wishlist = await getOrCreateWishlist(user.id)

  const { data: existing } = await supabaseAdmin
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlist.id)
    .eq("product_id", productId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin.from("wishlist_items").delete().eq("id", existing.id)
    revalidateWishlistPaths()
    return { added: false }
  }

  const { error } = await supabaseAdmin
    .from("wishlist_items")
    .insert({ wishlist_id: wishlist.id, product_id: productId })
  if (error) throw new Error(`Could not update wishlist: ${error.message}`)

  revalidateWishlistPaths()
  return { added: true }
}

export async function removeWishlistItem(itemId: string) {
  const user = await requireUser()
  const wishlist = await getOrCreateWishlist(user.id)

  await supabaseAdmin
    .from("wishlist_items")
    .delete()
    .eq("id", itemId)
    .eq("wishlist_id", wishlist.id)

  revalidateWishlistPaths()
}

// Adds the saved variant (or the cheapest in-stock variant) to the cart and
// removes the wishlist entry.
export async function moveWishlistItemToCart(itemId: string) {
  const user = await requireUser()
  const wishlist = await getOrCreateWishlist(user.id)

  const { data: item } = await supabaseAdmin
    .from("wishlist_items")
    .select(
      "id,variant_id,product:products(id,status,variants:product_variants(id,price_cents,inventory_quantity))"
    )
    .eq("id", itemId)
    .eq("wishlist_id", wishlist.id)
    .maybeSingle()
  if (!item) throw new Error("Wishlist item not found")

  const product = item.product as unknown as {
    status: string
    variants: Array<{ id: string; price_cents: number; inventory_quantity: number }>
  } | null
  if (!product || product.status !== "published") {
    throw new Error("This product is no longer available.")
  }

  const inStock = product.variants.filter((v) => v.inventory_quantity > 0)
  const saved = inStock.find((v) => v.id === item.variant_id)
  const variant = saved ?? inStock.sort((a, b) => a.price_cents - b.price_cents)[0]
  if (!variant) throw new Error("This product is currently out of stock.")

  const cartId = await getOrCreateCartId()
  const { data: existing } = await supabaseAdmin
    .from("cart_items")
    .select("id,quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variant.id)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id)
  } else {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .insert({ cart_id: cartId, variant_id: variant.id, quantity: 1 })
    if (error) throw new Error(`Could not add to cart: ${error.message}`)
  }

  await supabaseAdmin.from("wishlist_items").delete().eq("id", item.id)

  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidateWishlistPaths()
}

// "Save for later" from the cart: stores the exact variant on the wishlist
// and removes the cart line.
export async function saveCartItemForLater(cartId: string, lineItemId: string) {
  const user = await getUser()
  if (!user) redirect("/sign-in?next=/cart")

  const { data: line } = await supabaseAdmin
    .from("cart_items")
    .select("id,variant_id,variant:product_variants(product_id)")
    .eq("id", lineItemId)
    .eq("cart_id", cartId)
    .maybeSingle()
  if (!line) throw new Error("Cart item not found")

  const productId = (line.variant as unknown as { product_id: string } | null)?.product_id
  if (!productId) throw new Error("Product not found for this cart item")

  const wishlist = await getOrCreateWishlist(user.id)

  // Upsert on the (wishlist, product) unique key, keeping the exact variant.
  const { error } = await supabaseAdmin
    .from("wishlist_items")
    .upsert(
      { wishlist_id: wishlist.id, product_id: productId, variant_id: line.variant_id },
      { onConflict: "wishlist_id,product_id" }
    )
  if (error) throw new Error(`Could not save for later: ${error.message}`)

  await supabaseAdmin.from("cart_items").delete().eq("id", line.id)

  revalidatePath("/cart")
  revalidatePath("/checkout")
  revalidateWishlistPaths()
}
