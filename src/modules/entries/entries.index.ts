import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/entries/entries.handler";
import * as routes from "@/modules/entries/entries.route";

import { getAllEntryStates } from "./entries.handler";
import { getAllEntryStatesRoute } from "./entries.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);
router.openapi(routes.getAllEntryTypes, handlers.getAllEntryTypes);
router.openapi(routes.createEntryRoute, handlers.create);
router.openapi(routes.getAllBundleIds, handlers.getAllBundleIds);
router.openapi(routes.getAllSeriesIds, handlers.getAllSeriesIds);
router.openapi(routes.getAllItemIds, handlers.getAllItemIds);
router.openapi(routes.getAllPackageIds, handlers.getAllPackageIds);
router.openapi(routes.getEntriesByType, handlers.getEntriesByType);
router.openapi(routes.updateEntryRoute, handlers.patch);
router.openapi(routes.deleteEntryRoute, handlers.removeSelected);
router.openapi(getAllEntryStatesRoute, getAllEntryStates);

export default router;
