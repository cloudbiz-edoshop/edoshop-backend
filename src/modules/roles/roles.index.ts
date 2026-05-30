import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/roles/roles.handler";
import * as routes from "@/modules/roles/roles.route";

// Create the router
const router = createRouter();

router
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.removeSelected, handlers.removeSelected);

export default router;
