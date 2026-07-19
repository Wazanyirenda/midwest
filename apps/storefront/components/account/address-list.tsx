"use client"

import { useState, useTransition } from "react"
import { MapPin, Plus } from "lucide-react"
import { deleteAddress, setDefaultShipping } from "@/app/actions/addresses"
import { AddressForm } from "./address-form"

export type Address = {
  id: string
  label: string | null
  first_name: string
  last_name: string
  phone: string | null
  address_1: string
  address_2: string | null
  city: string
  province: string
  postal_code: string
  is_default_shipping: boolean
}

function AddressCard({ address }: { address: Address }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  if (editing) {
    return (
      <div className="rounded-xl border border-brand-300 bg-white p-6 shadow-sm sm:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Edit address</h3>
        <AddressForm
          addressId={address.id}
          defaults={{
            label: address.label ?? "",
            first_name: address.first_name,
            last_name: address.last_name,
            phone: address.phone ?? "",
            address_1: address.address_1,
            address_2: address.address_2 ?? "",
            city: address.city,
            province: address.province,
            postal_code: address.postal_code,
            is_default_shipping: address.is_default_shipping,
          }}
          onDone={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {address.label && (
          <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-medium text-sand-700">
            {address.label}
          </span>
        )}
        {address.is_default_shipping && (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">
            Default
          </span>
        )}
      </div>

      <address className="space-y-0.5 text-sm not-italic text-gray-600">
        <p className="font-medium text-gray-900">
          {address.first_name} {address.last_name}
        </p>
        <p>{address.address_1}</p>
        {address.address_2 && <p>{address.address_2}</p>}
        <p>
          {address.city}, {address.province} {address.postal_code}
        </p>
        {address.phone && <p>{address.phone}</p>}
      </address>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button
          onClick={() => setEditing(true)}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Edit
        </button>
        {!address.is_default_shipping && (
          <>
            <button
              disabled={pending}
              onClick={() => startTransition(() => setDefaultShipping(address.id))}
              className="font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Set as default
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (confirm("Delete this address?")) {
                  startTransition(() => deleteAddress(address.id))
                }
              }}
              className="font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function AddressList({ addresses }: { addresses: Address[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 text-sand-400">
            <MapPin size={22} strokeWidth={1.5} />
          </span>
          <h2 className="text-lg font-semibold text-gray-700">No saved addresses</h2>
          <p className="mt-2 text-sm text-gray-500">
            Save an address to check out faster next time.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {addresses.map((a) => (
          <AddressCard key={a.id} address={a} />
        ))}
      </div>

      {adding ? (
        <div className="rounded-xl border border-brand-300 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">New address</h3>
          <AddressForm onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus size={15} />
          Add address
        </button>
      )}
    </div>
  )
}
