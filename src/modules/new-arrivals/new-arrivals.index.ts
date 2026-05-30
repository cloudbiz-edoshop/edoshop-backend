import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/new-arrivals/new-arrivals.handler";
import * as routes from "@/modules/new-arrivals/new-arrivals.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.addProducts, handlers.addProducts);
router.openapi(routes.removeProducts, handlers.removeProducts);
router.openapi(
  routes.listOnlyNewArrivalProducts,
  handlers.listOnlyNewArrivalProducts,
);

export default router;
