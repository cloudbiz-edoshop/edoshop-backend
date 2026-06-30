import { createRoute, z } from "@hono/zod-openapi";

import { jwtMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

const tags = ["CamPay"];

export const campayConfigSchema = z.object({
  enabled: z.boolean(),
  environment: z.string(),
  currency: z.string(),
});

export const campayTransactionStatusSchema = z.object({
  reference: z.string(),
  status: z.string(),
  operator: z.string().nullable(),
  amount: z.union([z.string(), z.number()]).nullable(),
  currency: z.string(),
  externalReference: z.string().nullable(),
  operatorReference: z.string().nullable(),
  reason: z.string().nullable(),
  paymentCompleted: z.boolean(),
  paymentFailed: z.boolean(),
});

export const getCampayConfig = createRoute({
  path: "/payments/campay/config",
  method: "get",
  tags,
  summary: "Get CamPay public configuration",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(campayConfigSchema),
      "CamPay public configuration",
    ),
  },
});

export const getCampayTransactionStatus = createRoute({
  path: "/payments/campay/transaction/{reference}",
  method: "get",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    params: z.object({
      reference: z.string().min(1),
    }),
  },
  summary: "Sync and return CamPay transaction status",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(campayTransactionStatusSchema),
      "CamPay transaction status",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
      ],
      z.object({ reference: z.string() }),
    ),
  },
});

export type GetCampayConfigRoute = typeof getCampayConfig;
export type GetCampayTransactionStatusRoute = typeof getCampayTransactionStatus;
