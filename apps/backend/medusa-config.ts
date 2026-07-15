import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Neon (and most managed Postgres) require SSL on every connection,
// including local dev — not just in production.
const dbUrl = process.env.DATABASE_URL || ""
const requiresSsl =
  process.env.NODE_ENV === "production" ||
  dbUrl.includes("neon.tech") ||
  dbUrl.includes("sslmode=require")

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Both forms are required: the server runtime (knex) reads `ssl`,
    // while the migration runner (MikroORM) reads `connection.ssl`.
    databaseDriverOptions: requiresSsl
      ? {
          ssl: { rejectUnauthorized: false },
          connection: { ssl: { rejectUnauthorized: false } },
        }
      : {},
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...(process.env.STRIPE_API_KEY
            ? [
                {
                  resolve: "@medusajs/payment-stripe",
                  id: "stripe",
                  options: {
                    apiKey: process.env.STRIPE_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  },
                },
              ]
            : []),
          ...(process.env.NOWPAYMENTS_API_KEY
            ? [
                {
                  resolve: "./src/modules/nowpayments",
                  id: "nowpayments",
                  options: {
                    apiKey: process.env.NOWPAYMENTS_API_KEY,
                    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
                    sandbox: process.env.NODE_ENV !== "production",
                  },
                },
              ]
            : []),
        ],
      },
    },
  ],
})
