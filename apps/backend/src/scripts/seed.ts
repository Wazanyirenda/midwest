import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedResearchPeptides({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  logger.info("Seeding research peptides catalog...")

  const [defaultChannel] = await salesChannelModuleService.listSalesChannels({
    name: ["Default Sales Channel"],
  })

  const peptideProducts = [
    {
      title: "BPC-157",
      subtitle: "Body Protection Compound-157",
      description:
        "BPC-157 is a synthetic peptide consisting of 15 amino acids. For research purposes only.",
      handle: "bpc-157",
      status: "published" as const,
      options: [{ title: "Size", values: [] }, { title: "Purity", values: [] }],
      variants: [
        {
          title: "5mg / 99%+ Purity",
          sku: "BPC157-5MG-99",
          options: { Size: "5mg", Purity: "99%+" },
          prices: [{ amount: 4500, currency_code: "usd" }],
          inventory_quantity: 100,
          manage_inventory: true,
        },
        {
          title: "10mg / 99%+ Purity",
          sku: "BPC157-10MG-99",
          options: { Size: "10mg", Purity: "99%+" },
          prices: [{ amount: 7500, currency_code: "usd" }],
          inventory_quantity: 50,
          manage_inventory: true,
        },
      ],
    },
    {
      title: "TB-500",
      subtitle: "Thymosin Beta-4 Fragment",
      description:
        "TB-500 is a synthetic version of the naturally occurring peptide Thymosin Beta-4. For research purposes only.",
      handle: "tb-500",
      status: "published" as const,
      options: [{ title: "Size", values: [] }, { title: "Purity", values: [] }],
      variants: [
        {
          title: "5mg / 99%+ Purity",
          sku: "TB500-5MG-99",
          options: { Size: "5mg", Purity: "99%+" },
          prices: [{ amount: 5500, currency_code: "usd" }],
          inventory_quantity: 80,
          manage_inventory: true,
        },
      ],
    },
    {
      title: "Semaglutide",
      subtitle: "GLP-1 Receptor Agonist Peptide",
      description:
        "Semaglutide is a glucagon-like peptide-1 (GLP-1) receptor agonist peptide. For research purposes only.",
      handle: "semaglutide",
      status: "published" as const,
      options: [{ title: "Size", values: [] }, { title: "Purity", values: [] }],
      variants: [
        {
          title: "2mg / 99%+ Purity",
          sku: "SEMA-2MG-99",
          options: { Size: "2mg", Purity: "99%+" },
          prices: [{ amount: 6500, currency_code: "usd" }],
          inventory_quantity: 60,
          manage_inventory: true,
        },
        {
          title: "5mg / 99%+ Purity",
          sku: "SEMA-5MG-99",
          options: { Size: "5mg", Purity: "99%+" },
          prices: [{ amount: 12000, currency_code: "usd" }],
          inventory_quantity: 30,
          manage_inventory: true,
        },
      ],
    },
  ]

  for (const product of peptideProducts) {
    await productModuleService.createProducts([product])
    logger.info(`Seeded: ${product.title}`)
  }

  logger.info("Seeding complete.")
}
