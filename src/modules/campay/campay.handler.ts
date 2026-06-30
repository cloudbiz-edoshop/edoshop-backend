import type { Context } from "hono";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import type { GetCampayTransactionStatusRoute } from "./campay.route";
import { campayService } from "./campay.service";

export const getCampayConfig = async (c: Context) => {
  return c.json(
    successResponse(campayService.getPublicConfig(), "CamPay config retrieved"),
    HttpStatusCodes.OK,
  );
};

export const getCampayTransactionStatus: AppRouteHandler<
  GetCampayTransactionStatusRoute
> = async (c) => {
  const { reference } = c.req.valid("param");
  const accessTokenPayload = c.get("accessTokenPayload");

  const result = await campayService.syncTransactionStatus(
    reference,
    accessTokenPayload.userId,
  );

  return c.json(
    successResponse(result, "CamPay transaction status retrieved"),
    HttpStatusCodes.OK,
  );
};
