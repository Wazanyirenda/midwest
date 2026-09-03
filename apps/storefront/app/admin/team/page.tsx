import { requireAdminOrRedirect } from "@/lib/admin"
import { getUser } from "@/lib/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { RoleSelect } from "@/components/admin/role-select"
import type { Role } from "@/lib/admin"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  first_name: string | null
  last_name: string | null
  role: Role
  created_at: string
}

export default async function AdminTeamPage() {
  // Staff can reach the admin area but must not be able to promote themselves.
  await requireAdminOrRedirect()
  const me = await getUser()

  const { data } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,role,created_at")
    .order("role")
    .order("created_at")

  const profiles = (data ?? []) as unknown as Row[]

  // Emails live in auth.users, which PostgREST doesn't expose.
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? "—"])
  )

  const staff = profiles.filter((p) => p.role !== "customer")
  const customers = profiles.filter((p) => p.role === "customer")

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-sand-900">Team &amp; roles</h1>
        <p className="mt-0.5 text-sm text-sand-600">
          {staff.length} with admin access · {customers.length} customers
        </p>
      </header>

      <div className="rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-600">
        <p>
          <strong className="text-sand-800">Staff</strong> — orders and
          inventory. Cannot change products, pricing, settings, or roles.
        </p>
        <p className="mt-1">
          <strong className="text-sand-800">Admin</strong> — everything,
          including this page.
        </p>
      </div>

      {[
        { title: "Admin access", rows: staff, empty: "Nobody has admin access." },
        { title: "Customers", rows: customers, empty: "No customer accounts." },
      ].map((group) => (
        <section
          key={group.title}
          className="rounded-xl border border-sand-200 bg-white"
        >
          <header className="border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-sand-900">{group.title}</h2>
          </header>
          {group.rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-sand-600">{group.empty}</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {group.rows.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(" ")
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-sand-900">
                        {name || "(no name)"}
                      </p>
                      <p className="truncate text-xs text-sand-600">
                        {emailById.get(p.id) ?? "—"}
                      </p>
                    </div>
                    <RoleSelect
                      userId={p.id}
                      current={p.role}
                      isSelf={p.id === me?.id}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
