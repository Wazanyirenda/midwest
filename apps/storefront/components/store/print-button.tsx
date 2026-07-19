"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 print:hidden"
    >
      Print / Save as PDF
    </button>
  )
}
