import type { MiddlewareHandler, Next } from "hono";

import type {
  AppContext,
  JWTAccessTokenPayload,
  JWTRefreshTokenPayload,
} from "@/lib/types";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { env } from "@/config";
import { db } from "@/db";
import { users } from "@/db/models";
import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import * as HttpStatusPhrases from "@/lib/http-status-phrases";
import { jsonContent } from "@/lib/openapi/helpers";
import { createErrorResponseSchema } from "@/lib/openapi/schemas";
import { JWTAccessTokenPayloadSchema } from "@/lib/types";

// JWT Secret management with rotation support
const JWT_SECRETS = {
  current: env.JWT_SECRET,
  previous: env.JWT_SECRET_PREVIOUS,
};

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

const signHs256 = (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
};

const verifyHs256 = <T>(token: string, secret: string): T => {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("invalid token");
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("signature verification failed");
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp <= now) {
    throw new Error("token expired");
  }
  if (typeof payload.nbf === "number" && payload.nbf > now) {
    throw new Error("token nbf");
  }

  return payload as T;
};

/**
 * Signs a JWT access token with the provided payload
 *
 * @param payload - The data to include in the JWT token (user ID and username)
 * @param expiresIn - Token expiration time in seconds (defaults to env.ACCESS_TOKEN_EXPIRY)
 * @returns A Promise that resolves to the signed JWT token string
 */
export const signJwtToken = async (
  payload: Omit<JWTAccessTokenPayload, "iat" | "exp">,
  expiresIn: number = env.ACCESS_TOKEN_EXPIRY,
): Promise<string> => {
  const token = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };
  return signHs256(token, JWT_SECRETS.current);
};

/**
 * Signs a JWT refresh token with the provided payload
 *
 * @param payload - The data to include in the refresh token (user ID, username, and token version)
 * @returns A Promise that resolves to the signed refresh token string
 */
export const signRefreshToken = async (
  payload: Omit<JWTRefreshTokenPayload, "iat" | "exp">,
): Promise<string> => {
  const token = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + env.REFRESH_TOKEN_EXPIRY,
  };
  return signHs256(token, JWT_SECRETS.current);
};

/**
 * Verifies a JWT token with support for key rotation
 *
 * @template T - The expected payload type
 * @param token - The JWT token string to verify
 * @returns A Promise that resolves to the decoded token payload
 * @throws Will throw an error if token verification fails with both current and previous secrets
 */
export const verifyJwtToken = async <T>(token: string): Promise<T> => {
  try {
    // Try with current secret first
    return verifyHs256<T>(token, JWT_SECRETS.current);
  } catch (error) {
    // If failed, try with previous secret (supports rotation)
    try {
      return verifyHs256<T>(token, JWT_SECRETS.previous);
    } catch {
      throw error; // Re-throw original error if both attempts fail
    }
  }
};

/**
 * Middleware that verifies a JWT access token in the Authorization header
 *
 * Extracts the token, verifies it, validates the payload structure,
 * checks if the user exists, and sets user data in the context.
 *
 * @returns A middleware handler function
 */
export const jwtMiddleware = (): MiddlewareHandler => {
  return async (c: AppContext, next: Next) => {
    try {
      const token = c.req.header("Authorization")?.replace("Bearer ", "");
      if (!token) {
        c.var.logger.error("No token found");
        const message = "Unauthorized - Invalid or missing JWT token";
        const error = new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message,
          res: c.json(
            errorResponse(HttpStatusCodes.UNAUTHORIZED, message),
            HttpStatusCodes.UNAUTHORIZED,
          ),
        });
        throw error;
      }

      const decoded = await verifyJwtToken<JWTAccessTokenPayload>(token);
      JWTAccessTokenPayloadSchema.parse(decoded);
      // check if user exists in db
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });
      if (!user) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: "Unauthorized - User not found",
        });
      }
      // check username with decoded.username
      if (user.username !== decoded.username) {
        throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
          message: "Unauthorized - Invalid username",
        });
      }
      c.set("accessTokenPayload", decoded);
      c.set("user", user);
      c.var.logger.info("JWT middleware passed");
      c.var.logger.info(c.get("accessTokenPayload"));
      return next();
    } catch (err: unknown) {
      // Check error message to determine specific error type
      const errorMessage =
        err instanceof Error || err instanceof HTTPException
          ? err.message
          : String(err);

      let message =
        errorMessage || "Unauthorized - Invalid or missing JWT token";
      if (errorMessage.includes("expired")) {
        message = "Unauthorized - JWT token has expired";
      } else if (errorMessage.includes("nbf")) {
        message = "Unauthorized - JWT token not yet valid (nbf)";
      } else if (errorMessage.includes("signature")) {
        message = "Unauthorized - JWT token signature mismatch";
      } else if (errorMessage.includes("invalid")) {
        message = "Unauthorized - JWT token is invalid";
      } else if (errorMessage.includes("algorithm")) {
        message = "Unauthorized - JWT algorithm not supported";
      }

      const statusCode =
        err instanceof HTTPException
          ? err.status
          : HttpStatusCodes.UNAUTHORIZED;

      // Create the error response without including the details property
      const response = errorResponse(statusCode, message);

      throw new HTTPException(statusCode, {
        message,
        res: c.json(response, statusCode),
      });
    }
  };
};

/**
 * Middleware that verifies a JWT refresh token in the Authorization header
 *
 * Extracts the token, verifies it, and sets the payload in the context.
 *
 * @param c - The application context
 * @param next - The next middleware function
 * @throws Will throw an HTTPException if the token is invalid or missing
 */
export const refreshTokenMiddleware = async (c: AppContext, next: Next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    const message = "Unauthorized - Invalid or missing refresh token";
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message,
      res: c.json(
        errorResponse(HttpStatusCodes.UNAUTHORIZED, message),
        HttpStatusCodes.UNAUTHORIZED,
      ),
    });
  }

  try {
    const decoded = await verifyJwtToken<JWTRefreshTokenPayload>(token);
    c.set("refreshTokenPayload", decoded);
    await next();
  } catch (err: unknown) {
    c.var.logger.error(err);
    const message = "Invalid or expired refresh token";
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message,
      res: c.json(
        errorResponse(HttpStatusCodes.UNAUTHORIZED, message),
        HttpStatusCodes.UNAUTHORIZED,
      ),
    });
  }
};

/**
 * Standard JWT error responses for OpenAPI documentation
 *
 * Defines the error responses that can be returned when JWT authentication fails
 */
export const jwtErrorResponses = {
  [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
    createErrorResponseSchema(
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusPhrases.UNAUTHORIZED,
    ),
    "Unauthorized - JWT token is invalid, expired, or missing",
  ),
};
