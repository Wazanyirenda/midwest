import "server-only"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { CART_COOKIE } from "@/lib/cart"

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
} as const

// Called right after a successful sign-in (server action or confirm route —
// both may write cookies). Ensures the signed-in user ends up with one open
// cart that follows them across devices:
//   - anonymous cookie cart only  → claim it for the user
//   - existing user cart only     → point the cookie at it
//   - both                        → merge anon items into the user cart
export async function mergeCartOnSignIn(userId: string): Promise<void> {
  const cookieStore = await cookies()
  const anonCartId = cookieStore.get(CART_COOKIE)?.value

  let anonCart: { id: string; user_id: string | null } | null = null
  if (anonCartId) {
    const { data } = await supabaseAdmin
      .from("carts")
      .select("id,user_id")
      .eq("id", anonCartId)
      .is("completed_at", null)
      .maybeSingle()
    // A cart already owned by someone else (shared browser) is not ours to merge.
    if (data && (data.user_id === null || data.user_id === userId)) {
      anonCart = data
    }
  }

  const { data: userCart } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .is("completed_at", null)
    .neq("id", anonCart?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (anonCart && !userCart) {
    if (anonCart.user_id !== userId) {
      await supabaseAdmin
        .from("carts")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", anonCart.id)
    }
    return
  }

  if (!anonCart && userCart) {
    cookieStore.set(CART_COOKIE, userCart.id, CART_COOKIE_OPTIONS)
    return
  }

  if (anonCart && userCart) {
    const { data: anonItems } = await supabaseAdmin
      .from("cart_items")
      .select("variant_id,quantity")
      .eq("cart_id", anonCart.id)

    for (const item of anonItems ?? []) {
      const { data: existing } = await supabaseAdmin
        .from("cart_items")
        .select("id,quantity")
        .eq("cart_id", userCart.id)
        .eq("variant_id", item.variant_id)
        .maybeSingle()

      if (existing) {
        await supabaseAdmin
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id)
      } else {
        await supabaseAdmin
          .from("cart_items")
          .insert({
            cart_id: userCart.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          })
      }
    }

    await supabaseAdmin.from("carts").delete().eq("id", anonCart.id)
    cookieStore.set(CART_COOKIE, userCart.id, CART_COOKIE_OPTIONS)
  }
}
