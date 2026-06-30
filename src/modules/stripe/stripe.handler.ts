import type { Context } from "hono";

import type { CheckoutDirectOrderRequest } from "@/modules/orders/orders.schema";
import type { AppRouteHandler } from "@/lib/types";
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import type { CheckoutStripeOrderRoute } from "./stripe.route";
import { stripeService } from "./stripe.service";

export const getStripeConfig = async (c: Context) => {
  return c.json(
    successResponse(stripeService.getPublicConfig(), "Stripe config retrieved"),
    HttpStatusCodes.OK,
  );
};

export const stripeWebhook = async (c: Context) => {
  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.text();

  const result = await stripeService.handleWebhook(rawBody, signature);

  return c.json(result, HttpStatusCodes.OK);
};

export const checkoutStripeOrder: AppRouteHandler<CheckoutStripeOrderRoute> = async (c) => {
  const payload = c.req.valid("json") as CheckoutDirectOrderRequest;
  const accessTokenPayload = c.get("accessTokenPayload");

  const result = await stripeService.checkoutDirectOrder(
    accessTokenPayload.userId,
    payload,
  );

  return c.json(
    successResponse(result, "Stripe checkout initialized"),
    HttpStatusCodes.CREATED,
  );
};
