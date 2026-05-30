import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/employees/employees.handler";
import * as routes from "@/modules/employees/employees.route";
// Create the router
const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
