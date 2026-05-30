import { createRouter } from "@/lib/create-app";

import * as handlers from "./mobile-upload.handler";
import * as routes from "./mobile-upload.route";

const router = createRouter();

router.openapi(routes.mobileUploadRoute, handlers.uploadImages);
router.openapi(routes.mobileListImagesRoute, handlers.listImages);
router.openapi(routes.mobileDeleteImagesRoute, handlers.deleteImages);

export default router;
