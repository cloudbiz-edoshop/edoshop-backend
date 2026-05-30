import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/orders/orders.handler";
import * as routes from "@/modules/orders/orders.route";

const router = createRouter();

router.openapi(routes.getOrdersToFulfill, handlers.getOrdersToFulfill);
router.openapi(routes.getOrderDetailsForACustomer, handlers.getOrderDetailsForACustomer);
router.openapi(routes.updateAvailableQuantityForFulfillment, handlers.updateAvailableQuantity);

export default router;
