import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/reviews/reviews.handler";
import * as routes from "@/modules/reviews/reviews.route";

const router = createRouter();

router
  .openapi(routes.listAll, handlers.listAll)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.updateStatus, handlers.updateStatus)
  .openapi(routes.remove, handlers.remove);

export default router;
