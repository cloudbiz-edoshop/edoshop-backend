import type { Context, MiddlewareHandler, Next } from "hono";

import { getConnInfo } from "@hono/node-server/conninfo";

/**
 * Middleware that extracts and stores client IP address and user agent
 *
 * Gets the client IP address from either the connection info or x-forwarded-for header,
 * and the user agent from the request headers. Sets these values in the context
 * for use in subsequent handlers.
 *
 * @param c - The application context
 * @param next - The next middleware function
 * @returns The result of the next middleware
 */
export const ipAndUserAgent: MiddlewareHandler = async (c: Context, next: Next) => {
  let ipAddress: string | undefined;

  try {
    const info = getConnInfo(c);
    ipAddress = info.remote.address ?? c.req.header("x-forwarded-for");
  }
  catch {
    // In test environment, getConnInfo might not work
    ipAddress = c.req.header("x-forwarded-for") ?? "127.0.0.1";
  }

  const userAgent = c.req.header("user-agent");
  c.set("ipAddress", ipAddress ?? "unknown");
  c.set("userAgent", userAgent ?? "unknown");
  return next();
};
