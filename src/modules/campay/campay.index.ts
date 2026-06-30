import { createRouter } from "@/lib/create-app";

import * as handlers from "./campay.handler";
import * as routes from "./campay.route";

const router = createRouter();

router.openapi(routes.getCampayConfig, handlers.getCampayConfig as never);
router.openapi(
  routes.getCampayTransactionStatus,
  handlers.getCampayTransactionStatus,
);

export default router;
