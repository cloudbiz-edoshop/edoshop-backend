import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/about-us/about-us.handler";
import * as routes from "@/modules/about-us/about-us.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
