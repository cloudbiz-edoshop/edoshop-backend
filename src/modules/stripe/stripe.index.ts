import { createRouter } from "@/lib/create-app";

import * as handlers from "./stripe.handler";
import * as routes from "./stripe.route";

const router = createRouter();

router.openapi(routes.getStripeConfig, handlers.getStripeConfig as never);
router.openapi(routes.checkoutStripeOrder, handlers.checkoutStripeOrder);

router.post("/payments/stripe/webhook", handlers.stripeWebhook);

export default router;
