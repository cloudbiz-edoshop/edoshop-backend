import { createRouter } from "@/lib/create-app";

import * as handlers from "./upload-tokens.handler";
import * as routes from "./upload-tokens.route";

const router = createRouter();

router.openapi(routes.generateUploadTokenRoute, handlers.generateToken);
router.openapi(routes.validateUploadTokenRoute, handlers.validateToken);

export default router;
