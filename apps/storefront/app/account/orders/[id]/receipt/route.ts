import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth"
import { getReceiptForUser } from "@/lib/orders"
import { buildReceiptPdf } from "@/lib/receipt-pdf"

type Context = {
  params: Promise<{ id: string }>
}

// The same PDF the confirmation email attaches, for a customer who lost the
// email or wants it on a phone, where the browser print dialog is awkward.
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params
  const user = await requireUser("/account/orders")

  const orderId = z.string().uuid().safeParse(id)
  // One 404 for malformed, missing, someone else's and unpaid alike, so the
  // response says nothing about which orders exist.
  const receipt = orderId.success ? await getReceiptForUser(orderId.data, user) : null
  if (!receipt) return new NextResponse("Not Found", { status: 404 })

  try {
    const pdf = await buildReceiptPdf(receipt)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${receipt.displayId}.pdf"`,
        // A receipt carries a home address — keep it out of shared caches.
        "Cache-Control": "private, no-store",
      },
    })
  } catch (e) {
    console.error("[receipt] PDF failed:", e)
    return new NextResponse("Could not generate the receipt.", { status: 500 })
  }
}
