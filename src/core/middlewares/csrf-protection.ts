import type { Context, Next } from "hono";

import { randomBytes } from "node:crypto";
import { getConnInfo } from "@hono/node-server/conninfo";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import { appConfig, env } from "@/config";
import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

// Configuration
const CSRF_TOKEN_LENGTH = 32; // Length of the token in bytes
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: appConfig.isProduction,
  sameSite: "strict" as const, // Prevent CSRF by not sending in cross-site requests
  path: "/",
  maxAge: 60 * 60, // 1 hour in seconds (reduced from 1 day)
};

// Dedicated secret for CSRF token signing
const CSRF_SECRET = env.CSRF_SECRET;

/**
 * Generate a new CSRF token
 * @returns CSRF token as a hex string
 */
export const generateCsrfToken = (): string => {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
};

/**
 * Middleware to set a CSRF token cookie
 * This should be used on GET requests to set the token if not already present
 */
export const setCsrfToken = async (c: Context, next: Next) => {
  // Only set on GET requests
  if (c.req.method === "GET") {
    // Check if a valid token already exists
    const existingToken = await getSignedCookie(
      c,
      CSRF_SECRET,
      CSRF_COOKIE_NAME,
    );

    if (!existingToken) {
      const token = generateCsrfToken();

      // Sign the cookie with dedicated CSRF secret
      await setSignedCookie(
        c,
        CSRF_COOKIE_NAME,
        token,
        CSRF_SECRET,
        CSRF_COOKIE_OPTIONS,
      );

      // Store token in the response context for templates to access
      // instead of putting it in headers
      c.set("csrfToken", token);
    } else {
      // Store existing token in context for templates
      c.set("csrfToken", existingToken);
    }
  }

  await next();
};

/**
 * Middleware to verify CSRF token
 * This should be used on state-changing methods (POST, PUT, DELETE, etc.)
 */
export const verifyCsrfToken = async (c: Context, next: Next) => {
  // Only verify for state-changing methods
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!stateChangingMethods.includes(c.req.method)) {
    await next();
    return;
  }

  // Get the token from the request header
  const headerToken = c.req.header(CSRF_HEADER_NAME);

  // Get the token from the signed cookie
  const cookieToken = await getSignedCookie(c, CSRF_SECRET, CSRF_COOKIE_NAME);

  // If both tokens exist and match, continue
  if (headerToken && cookieToken && headerToken === cookieToken) {
    await next();
    return;
  }
  c.var.logger?.warn(
    `CSRF token validation failed headerToken: ${headerToken} cookieToken: ${cookieToken}`,
  );

  const info = getConnInfo(c);

  // Log the CSRF attempt
  c.var.logger?.warn({
    action: "csrf_attempt",
    headerToken: !!headerToken,
    cookieToken: !!cookieToken,
    ip: c.req.header("x-forwarded-for") ?? info.remote.address ?? "unknown",
    url: c.req.url,
    method: c.req.method,
  });

  // Clear the invalid CSRF token
  if (cookieToken) {
    deleteCookie(c, CSRF_COOKIE_NAME, { path: "/" });
  }

  // Return error response
  const error = new HTTPException(HttpStatusCodes.FORBIDDEN, {
    res: c.json(
      errorResponse(
        HttpStatusCodes.FORBIDDEN,
        "CSRF token validation failed. Please refresh the page and try again.",
      ),
      HttpStatusCodes.FORBIDDEN,
    ),
  });
  error.message = "CSRF token validation failed";
  throw error;
};

/**
 * Combined middleware for CSRF protection
 * - Sets CSRF token on GET requests (only if not already present)
 * - Verifies CSRF token on state-changing requests
 */
export const csrfProtection = async (c: Context, next: Next) => {
  // Set token on GET requests
  if (c.req.method === "GET") {
    await setCsrfToken(c, async () => {});
  } else {
    // Verify token on state-changing requests
    await verifyCsrfToken(c, async () => {});
  }

  await next();
};
