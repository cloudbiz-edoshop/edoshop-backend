import { createRoute, z } from "@hono/zod-openapi";

import { storesSchema } from "@/db/models/stores";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { commonErrorResponses, jsonContent } from "@/lib/openapi/helpers";

export const getAllStoresRoute = createRoute({
  path: "/stores",
  method: "get",
  summary: "List all stores",
  description: "List all stores",
  tags: ["Stores"],
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(storesSchema),
      "The list of all stores",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});
