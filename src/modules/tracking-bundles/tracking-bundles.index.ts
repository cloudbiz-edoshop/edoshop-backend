import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/tracking-bundles/tracking-bundles.handler";
import * as routes from "@/modules/tracking-bundles/tracking-bundles.route";

const router = createRouter();

router.openapi(routes.listSteps, handlers.listSteps);
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.searchOrder, handlers.searchOrder);
router.openapi(routes.assignOrders, handlers.assignOrders);
router.openapi(routes.removeOrder, handlers.removeOrder);
router.openapi(routes.updateStep, handlers.updateStep);

export default router;
