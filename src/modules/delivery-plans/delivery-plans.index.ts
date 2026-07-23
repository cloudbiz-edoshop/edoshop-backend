import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/delivery-plans/delivery-plans.handler";
import * as routes from "@/modules/delivery-plans/delivery-plans.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.listFeeRules, handlers.listFeeRules);
router.openapi(routes.createFeeRule, handlers.createFeeRule);
router.openapi(routes.updateFeeRule, handlers.updateFeeRule);
router.openapi(routes.removeFeeRule, handlers.removeFeeRule);

export default router;
