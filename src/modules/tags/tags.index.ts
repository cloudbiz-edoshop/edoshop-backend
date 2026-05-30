import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/tags/tags.handler";
import * as routes from "@/modules/tags/tags.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
