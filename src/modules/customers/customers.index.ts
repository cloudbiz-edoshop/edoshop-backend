import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/customers/customers.handler";
import * as routes from "@/modules/customers/customers.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getAllCustomerCodes, handlers.getAllCustomerCodes);
router.openapi(routes.getAllCustomerIds, handlers.getAllCustomerIds);
router.openapi(routes.getAllCustomerNames, handlers.getAllCustomerNames);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
