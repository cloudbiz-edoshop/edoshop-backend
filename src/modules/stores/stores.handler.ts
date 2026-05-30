import type { getAllStoresRoute } from "./stores.route";

import type { AppRouteHandler } from "@/lib/types";

import { StoresService } from "./stores.service";

const storesService = new StoresService();

export const getAllStores: AppRouteHandler<typeof getAllStoresRoute> = async (
  c,
) => {
  const allStores = await storesService.getAllStores();
  return c.json(allStores, 200);
};
