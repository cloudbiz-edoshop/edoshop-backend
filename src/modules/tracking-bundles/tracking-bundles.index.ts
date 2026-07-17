import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/tracking-bundles/tracking-bundles.handler";
import * as routes from "@/modules/tracking-bundles/tracking-bundles.route";

const router = createRouter();

router.openapi(routes.listSteps, handlers.listSteps);
router.openapi(routes.list, handlers.list);
router.openapi(routes.listTrackedOrders, handlers.listTrackedOrders);
router.openapi(routes.getTrackedOrder, handlers.getTrackedOrder);
router.openapi(routes.updateTrackedOrderStep, handlers.updateTrackedOrderStep);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.searchOrder, handlers.searchOrder);
router.openapi(routes.assignOrders, handlers.assignOrders);
router.openapi(routes.removeOrder, handlers.removeOrder);
router.openapi(routes.updateStep, handlers.updateStep);
router.openapi(routes.undoLastStep, handlers.undoLastStep);
router.openapi(routes.createKiloBill, handlers.createKiloBill);

export default router;
