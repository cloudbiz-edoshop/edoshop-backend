import { createRouter } from "@/lib/create-app";

import * as handlers from "./ongoing-groups.handler";
import * as routes from "./ongoing-groups.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.undo, handlers.undo);
router.openapi(routes.ongoingRequestsByUser, handlers.ongoingRequestsByUser);
export default router;
