import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Static COA metadata keyed by product handle.
// Replace with DB-backed data when a real LIMS/COA system is in place.
const COA_DATA: Record<string, {
  batchId: string
  testedAt: string
  purity: string
  method: string
  lab: string
  notes?: string
}> = {
  "bpc-157": {
    batchId: "BPC157-2024-001",
    testedAt: "2024-11-15",
    purity: "99.2%",
    method: "HPLC",
    lab: "Midwest Analytical Labs",
  },
  "tb-500": {
    batchId: "TB500-2024-001",
    testedAt: "2024-11-18",
    purity: "99.4%",
    method: "HPLC",
    lab: "Midwest Analytical Labs",
  },
  "semaglutide": {
    batchId: "SEMA-2024-001",
    testedAt: "2024-11-20",
    purity: "99.1%",
    method: "HPLC",
    lab: "Midwest Analytical Labs",
    notes: "Mass spec confirmation included",
  },
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { handle } = req.params as { handle: string }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  const [product] = await productModule.listProducts({ handle: [handle] })

  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const coa = COA_DATA[handle]

  if (!coa) {
    res.status(404).json({ message: "COA not available for this product" })
    return
  }

  res.json({
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
    },
    coa: {
      batch_id: coa.batchId,
      tested_at: coa.testedAt,
      purity: coa.purity,
      test_method: coa.method,
      lab: coa.lab,
      notes: coa.notes ?? null,
    },
  })
}
