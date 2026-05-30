import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/variants/variants.handler";
import * as routes from "@/modules/variants/variants.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);
router.openapi(routes.getByProductId, handlers.getByProductId);
export default router;
