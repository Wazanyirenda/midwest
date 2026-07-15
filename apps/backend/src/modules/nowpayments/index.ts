import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import NOWPaymentsProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [NOWPaymentsProviderService],
})
