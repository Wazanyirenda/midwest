import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      // Protect all custom admin routes
      matcher: "/admin/custom/*",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
})
