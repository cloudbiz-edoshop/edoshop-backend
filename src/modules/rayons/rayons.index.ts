import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/rayons/rayons.handler";
import * as routes from "@/modules/rayons/rayons.route";

const router = createRouter();
router.openapi(
  routes.createBinsForShelf,
  handlers.createBinsForShelf,
);
router.openapi(
  routes.getAllShelvesForRayon,
  handlers.getAllShelvesForRayon,
);
router.openapi(
  routes.createShelvesForRayon,
  handlers.createShelvesForRayon,
);

router.openapi(
  routes.getRayonsForWarehouse,
  handlers.getRayonsForWarehouse,
);

router.openapi(
  routes.getRayonsStatsForAWarehouse,
  handlers.getRayonsStatsForAWarehouse,
);

router.openapi(
  routes.createRayonsForWarehouse,
  handlers.createRayonsForWarehouse,
);

router.openapi(
  routes.updateRayonForWarehouse,
  handlers.updateRayonForWarehouse,
);

router.openapi(
  routes.updateShelvesForRayon,
  handlers.updateShelvesForRayon,
);

router.openapi(
  routes.updateBinsForShelf,
  handlers.updateBinsForShelf,
);

export default router;
