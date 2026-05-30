import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/notifications/notifications.handler";
import * as routes from "@/modules/notifications/notifications.route";

const router = createRouter();

router.openapi(routes.getNotificationTypes, handlers.getNotificationTypes);
router.openapi(
  routes.getNotificationFrequencies,
  handlers.getNotificationFrequencies,
);
router.openapi(
  routes.getNotificationRecipientTypes,
  handlers.getNotificationRecipientTypes,
);
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.removeSelected, handlers.removeSelected);

export default router;
