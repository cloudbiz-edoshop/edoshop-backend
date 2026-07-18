import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/delivery-plans/delivery-plans.handler";
import * as routes from "@/modules/delivery-plans/delivery-plans.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.remove, handlers.remove);

export default router;
