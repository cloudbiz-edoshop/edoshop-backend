import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/retailers/retailers.handler";
import * as routes from "@/modules/retailers/retailers.route";

const router = createRouter();

router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.list, handlers.list);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeMany, handlers.removeMany);

export default router;
