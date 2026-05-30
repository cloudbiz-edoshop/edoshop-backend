import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/products/products.handler";
import * as routes from "@/modules/products/products.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getAllProductCodes, handlers.getAllProductCodes);
router.openapi(routes.getAllProductIds, handlers.getAllProductIds);
router.openapi(routes.getAllGroupCriteriaTypes, handlers.getAllGroupCriteriaTypes);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
