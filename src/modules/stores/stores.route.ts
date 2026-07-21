import { createRoute, z } from "@hono/zod-openapi";

import { EntityType, OperationType } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import { storesSchema } from "@/db/models/stores";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { commonErrorResponses, jsonContent } from "@/lib/openapi/helpers";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

export const getAllStoresRoute = createRoute({
  path: "/stores",
  method: "get",
  summary: "List all stores",
  description: "List all stores",
  tags: ["Stores"],
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.STORES, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
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
