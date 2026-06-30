import { createRoute, z } from "@hono/zod-openapi";

import { jwtMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas";
import { jwtHeaderSchema } from "@/lib/zod-schemas";
import {
  checkoutDirectOrderRequestSchema,
} from "@/modules/orders/orders.schema";

export const checkoutStripeOrderRequestSchema = checkoutDirectOrderRequestSchema
  .omit({ paymentMethodId: true, payOnDelivery: true })
  .extend({
    currency: z.enum(["xaf", "usd", "eur"]).optional().default("xaf"),
  });

const tags = ["Stripe"];

const stripeCurrencySchema = z.object({
  code: z.string(),
  label: z.string(),
  xafPerUnit: z.number().optional(),
});

export const stripeConfigSchema = z.object({
  enabled: z.boolean(),
  publishableKey: z.string(),
  defaultCurrency: z.string(),
  currencies: z.array(stripeCurrencySchema),
});

export const checkoutStripeResponseSchema = z.object({
  orderId: z.number(),
  orderCode: z.string(),
  totalAmount: z.string(),
  chargeAmount: z.string(),
  currency: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  clientSecret: z.string(),
  paymentIntentId: z.string(),
});

export const getStripeConfig = createRoute({
  path: "/payments/stripe/config",
  method: "get",
  tags,
  summary: "Get Stripe publishable configuration",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(stripeConfigSchema),
      "Stripe public configuration",
    ),
  },
});

export const checkoutStripeOrder = createRoute({
  path: "/orders/checkout/stripe",
  method: "post",
  tags,
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      checkoutStripeOrderRequestSchema,
      "Stripe checkout payload",
    ),
  },
  summary: "Initialize Stripe checkout for a direct order",
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(checkoutStripeResponseSchema),
      "Stripe payment intent created",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      checkoutStripeOrderRequestSchema,
    ),
  },
});

export type GetStripeConfigRoute = typeof getStripeConfig;
export type CheckoutStripeOrderRoute = typeof checkoutStripeOrder;
