import { createRouter } from "@/lib/create-app";

import * as handlers from "./entry-images.handler";
import * as routes from "./entry-images.route";

const router = createRouter();

router.openapi(routes.listEntryImagesRoute, handlers.listImages);
router.openapi(routes.uploadEntryImagesRoute, handlers.uploadImages);
router.openapi(routes.replaceEntryImagesRoute, handlers.replaceImages);
router.openapi(routes.deleteEntryImagesRoute, handlers.deleteImages);

export default router;
