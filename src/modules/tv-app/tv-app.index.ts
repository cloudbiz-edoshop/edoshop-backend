import { createRouter } from "@/lib/create-app";

import * as handlers from "./tv-app.handler";
import * as routes from "./tv-app.route";

const router = createRouter();

router.openapi(routes.getOverview, handlers.getOverview);
router.openapi(routes.getSettings, handlers.getSettings);
router.openapi(routes.patchSettings, handlers.patchSettings);
router.openapi(routes.listAds, handlers.listAds);
router.openapi(routes.createAd, handlers.createAd);
router.openapi(routes.getAd, handlers.getAd);
router.openapi(routes.patchAd, handlers.patchAd);
router.openapi(routes.deleteAds, handlers.deleteAds);
router.openapi(routes.listDevices, handlers.listDevices);
router.openapi(routes.registerDevice, handlers.registerDevice);
router.openapi(routes.patchDevice, handlers.patchDevice);
router.openapi(routes.getCatalog, handlers.getCatalog);
router.openapi(routes.updateCatalog, handlers.updateCatalog);
router.openapi(routes.listVideos, handlers.listVideos);
router.openapi(routes.authToken, handlers.authToken);
router.openapi(routes.authRefresh, handlers.authRefresh);
router.openapi(routes.getMagazineVersion, handlers.getMagazineVersion);
router.openapi(routes.getMagazineFeed, handlers.getMagazineFeed);

export default router;
