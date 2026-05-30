import { createRouter } from "@/lib/create-app";

import * as handlers from "./uploads.handler";
import * as routes from "./uploads.route";

const router = createRouter();

router.openapi(routes.presignedUrlRoute, handlers.getPresignedUrl);
router.openapi(routes.uploadFilesRoute, handlers.uploadFiles);
router.openapi(routes.listFilesRoute, handlers.listFiles);
router.openapi(routes.deleteFilesRoute, handlers.deleteFiles);
router.openapi(routes.getFileInfoRoute, handlers.getFileInfo);
router.openapi(routes.replaceFilesRoute, handlers.replaceFiles);

export default router;
