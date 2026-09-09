import { requireStaffOrRedirect } from "@/lib/admin"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { AdminSidebar } from "@/components/admin/sidebar"

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware does a coarse role check, and every mutation re-checks via
  // requireAdmin()/requireStaff() — this is the layer that protects the
  // order/PII pages. Returns the role so the nav can hide admin-only items.
  const role = await requireStaffOrRedirect()

  // Badge count for the Inventory nav item. Compared per-variant against its
  // own reorder_point, so the number matches the alerts panel exactly.
  const [{ data: variants }, { count: printFailureCount }] = await Promise.all([
    supabase.from("product_variants").select("inventory_quantity,reorder_point"),
    // A label that gave up needs someone to notice, so it gets a nav badge of
    // its own rather than waiting to be found on the Printing page.
    supabase
      .from("print_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ])
  const alertCount = (variants ?? []).filter(
    (v) => v.inventory_quantity <= v.reorder_point
  ).length

  return (
    <div className="min-h-screen bg-sand-100 lg:flex">
      <AdminSidebar
        alertCount={alertCount}
        printFailureCount={printFailureCount ?? 0}
        role={role as "staff" | "admin"}
      />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  )
}
