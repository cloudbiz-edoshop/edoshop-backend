import { createRouter } from "@/lib/create-app";

import * as handlers from "./public-storefront.handler";
import * as routes from "./public-storefront.route";

const router = createRouter();

router
  .openapi(routes.listBanners, handlers.listBanners as any)
  .openapi(routes.listFaqs, handlers.listFaqs as any)
  .openapi(routes.listFilters, handlers.listFilters as any)
  .openapi(routes.listCategories, handlers.listCategories as any)
  .openapi(routes.listNewArrivalProducts, handlers.listNewArrivalProducts as any)
  .openapi(routes.listProducts, handlers.listProducts as any)
  .openapi(routes.listDiscounts, handlers.listDiscounts as any)
  .openapi(routes.listReviews, handlers.listReviews as any)
  .openapi(routes.listCustomers, handlers.listCustomers as any)
  .openapi(routes.listRetailers, handlers.listRetailers as any);

export default router;
