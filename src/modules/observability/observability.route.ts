import { createRoute } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/openapi/helpers";
import { createMessageObjectSchema } from "@/lib/openapi/schemas";

import { clientEventRequestSchema } from "./observability.schema";

const tags = ["Observability"];

export const postClientEvent = createRoute({
  path: "/observability/client-events",
  method: "post",
  tags,
  summary: "Ingest client-side errors for log-based alerting",
  description:
    "Accepts error beacons from admin and storefront. Events are written to structured API logs (Loki/Grafana).",
  request: {
    body: jsonContentRequired(clientEventRequestSchema, "Client error event"),
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      createMessageObjectSchema("Accepted"),
      "Event accepted",
    ),
  },
});
