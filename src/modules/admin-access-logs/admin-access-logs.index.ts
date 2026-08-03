import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/admin-access-logs/admin-access-logs.handler";
import * as routes from "@/modules/admin-access-logs/admin-access-logs.route";

const router = createRouter();

router.openapi(routes.list, handlers.list);

export default router;
