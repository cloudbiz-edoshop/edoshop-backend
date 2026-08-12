import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/dashboard/dashboard.handler";
import * as routes from "@/modules/dashboard/dashboard.route";

const router = createRouter();

router.openapi(routes.getMetrics, handlers.getMetrics);

export default router;
