import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/attributes/attributes.handler";
import * as routes from "@/modules/attributes/attributes.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.getTypes, handlers.getTypes);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
