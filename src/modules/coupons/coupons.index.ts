import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/coupons/coupons.handler";
import * as routes from "@/modules/coupons/coupons.route";

const router = createRouter();

router.openapi(routes.validatePublic, handlers.validatePublic);
router.openapi(routes.discountOptions, handlers.discountOptions);
router.openapi(routes.importGoogleQuiz, handlers.importGoogleQuiz);
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.remove, handlers.remove);

export default router;
