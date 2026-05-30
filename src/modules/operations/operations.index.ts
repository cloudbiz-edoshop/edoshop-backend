import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/operations/operations.handler";
import * as routes from "@/modules/operations/operations.route";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
