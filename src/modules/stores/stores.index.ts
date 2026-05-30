import { createRouter } from "@/lib/create-app";

import { getAllStores } from "./stores.handler";
import { getAllStoresRoute } from "./stores.route";

const router = createRouter();

router.openapi(getAllStoresRoute, getAllStores);

export default router;
