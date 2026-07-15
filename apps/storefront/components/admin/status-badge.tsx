export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    shipped: "bg-blue-50 text-blue-700 border-blue-200",
    delivered: "bg-sand-100 text-sand-600 border-sand-200",
    canceled: "bg-red-50 text-red-600 border-red-200",
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  )
}
