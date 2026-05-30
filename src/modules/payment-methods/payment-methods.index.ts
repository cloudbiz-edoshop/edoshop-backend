import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/payment-methods/payment-methods.handler";
import * as routes from "@/modules/payment-methods/payment-methods.route";

// Create the router
const router = createRouter();

// Public routes (no authentication required)
router
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne);

// Add the protected routes with JWT auth
router
  .openapi(routes.create, handlers.create)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.removeSelected, handlers.removeSelected);

export default router;
