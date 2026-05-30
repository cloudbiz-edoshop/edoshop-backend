import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/addresses/addresses.handler";
import * as routes from "@/modules/addresses/addresses.routes";

const router = createRouter();

router.openapi(routes.getAllCountries, handlers.getAllCountries);
router.openapi(routes.getAllCities, handlers.getAllCities);
router.openapi(routes.getCitiesByCountryCode, handlers.getCitiesByCountryCode);
router.openapi(routes.getCitiesByCountryId, handlers.getCitiesByCountryId);

export default router;
