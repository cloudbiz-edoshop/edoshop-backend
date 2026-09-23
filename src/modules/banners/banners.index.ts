import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/banners/banners.handler";
import * as routes from "@/modules/banners/banners.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
// Static paths must be registered before "/banners/{id}" so they are not
// matched as an id.
router.openapi(routes.getHomeDisplay, handlers.getHomeDisplay);
router.openapi(routes.patchHomeDisplay, handlers.patchHomeDisplay);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
