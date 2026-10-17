import { createRouter } from "@/lib/create-app";

import * as handlers from "./observability.handler";
import * as routes from "./observability.route";

const router = createRouter();

router.openapi(routes.postClientEvent, handlers.postClientEventHandler);

export default router;
