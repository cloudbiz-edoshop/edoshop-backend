import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/terms/terms.handler";
import * as routes from "@/modules/terms/terms.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.getDefaults, handlers.getDefaults);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);
router.openapi(routes.getPublic, handlers.getPublic);

export default router;
