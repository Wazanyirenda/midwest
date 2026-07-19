import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { AddressList, type Address } from "@/components/account/address-list"

export const metadata: Metadata = {
  title: "Saved Addresses",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses")

  const { data } = await supabaseAdmin
    .from("addresses")
    .select(
      "id,label,first_name,last_name,phone,address_1,address_2,city,province,postal_code,is_default_shipping"
    )
    .eq("user_id", user.id)
    .order("is_default_shipping", { ascending: false })
    .order("created_at", { ascending: false })

  const addresses = (data ?? []) as Address[]

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saved Addresses</h1>
        <p className="mt-1 text-gray-500">
          Your default address pre-fills at checkout.
        </p>
      </div>
      <AddressList addresses={addresses} />
    </main>
  )
}
