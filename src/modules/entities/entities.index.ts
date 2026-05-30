import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/entities/entities.handler";
import * as routes from "@/modules/entities/entities.route";

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
  .openapi(routes.remove, handlers.remove);

export default router;
