import type { MiddlewareHandler, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import type { AppContext } from "@/lib/types";
import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import { tvAppAuthService } from "./tv-app.auth.service";

export const tvDeviceMiddleware = (): MiddlewareHandler => {
  return async (c: AppContext, next: Next) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: "Unauthorized - Invalid or missing TV device token",
        });
      }

      const payload = tvAppAuthService.verifyAccessToken(token);
      await tvAppAuthService.assertDeviceAllowed(payload.deviceId);
      c.set("tvDevicePayload", payload);
      return next();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unauthorized TV device";
      const statusCode =
        err instanceof HTTPException
          ? err.status
          : HttpStatusCodes.UNAUTHORIZED;

      throw new HTTPException(statusCode, {
        message,
        res: c.json(errorResponse(statusCode, message), statusCode),
      });
    }
  };
};
