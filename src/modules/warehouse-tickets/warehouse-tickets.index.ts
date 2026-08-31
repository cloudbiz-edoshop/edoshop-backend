import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/warehouse-tickets/warehouse-tickets.handler";
import * as routes from "@/modules/warehouse-tickets/warehouse-tickets.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getSettings, handlers.getSettings);
router.openapi(routes.updateSettings, handlers.updateSettings);
router.openapi(routes.searchEntryOptions, handlers.searchEntryOptions);
router.openapi(routes.returnTicket, handlers.returnTicket);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.remove, handlers.remove);
router.openapi(routes.approve, handlers.approve);
router.openapi(routes.pause, handlers.pause);
router.openapi(routes.reject, handlers.reject);
router.openapi(routes.resume, handlers.resume);
router.openapi(routes.prepare, handlers.prepare);
router.openapi(routes.confirmTakeout, handlers.confirmTakeout);
router.openapi(routes.initiateReturn, handlers.initiateReturn);
router.openapi(routes.confirmReturn, handlers.confirmReturn);
router.openapi(routes.confirm, handlers.confirm);
router.openapi(routes.complete, handlers.complete);

export default router;
