import type { Context, Next } from "hono";

import { getConnInfo } from "@hono/node-server/conninfo";
import { HTTPException } from "hono/http-exception";

import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

/**
 * Rate limiting configuration options
 */
interface RateLimitOptions {
  /** Time window in milliseconds for rate limiting */
  windowMs: number;
  /** Maximum number of requests allowed in the time window */
  max: number;
  /** Optional custom error message when rate limit is exceeded */
  message?: string;
  /** Whether to send standard rate limit headers (X-RateLimit-*) */
  standardHeaders?: boolean;
  /** Function to generate unique keys for rate limiting (defaults to IP address) */
  keyGenerator?: (c: Context) => Promise<string>;
}

/**
 * Rate limit tracking record for a single key
 */
interface RateLimitRecord {
  /** Current count of requests in the time window */
  count: number;
  /** Timestamp when the current time window resets */
  resetTime: number;
}

/**
 * In-memory store for rate limiting records
 *
 * WARNING: This in-memory store is suitable for development or single-instance deployments.
 * For production use with multiple instances, consider implementing a distributed store
 * using Redis or a similar technology to ensure consistent rate limiting across instances.
 *
 * Example Redis implementation:
 * - Use INCRBY to increment counters
 * - Use EXPIRE to set TTL on keys
 * - Store would need to be injected into the rate limiter middleware
 */
const ipRequestMap = new Map<string, RateLimitRecord>();

// Clean up expired records every hour
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of ipRequestMap.entries()) {
      if (now > record.resetTime) {
        ipRequestMap.delete(key);
      }
    }
  },
  60 * 60 * 1000,
);

/**
 * Creates a rate limiting middleware
 *
 * Tracks request frequency by IP address (or custom key) and rejects requests
 * that exceed the configured limit within the specified time window.
 *
 * @param options - Rate limiting configuration options
 * @returns Hono middleware function that implements rate limiting
 */
export const rateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs = 60 * 1000, // 1 minute by default
    max = 100, // 100 requests per minute by default
    message = "Too many requests, please try again later.",
    standardHeaders = true,
    keyGenerator = async (c: Context) => {
      try {
        const connInfo = getConnInfo(c);
        // Get client IP from headers or connection info
        return (
          c.req.header("x-forwarded-for") ?? connInfo.remote.address ?? "unknown"
        );
      }
      catch {
        // In test environment or when connInfo is not available
        return c.req.header("x-forwarded-for") ?? "127.0.0.1";
      }
    },
  } = options;

  return async (c: Context, next: Next) => {
    const key = await keyGenerator(c);
    const now = Date.now();

    // Get current record or create new one
    let record = ipRequestMap.get(key);
    if (!record) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
      ipRequestMap.set(key, record);
    } else if (now > record.resetTime) {
      // Reset if the time window has passed
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    // Increment request count
    record.count++;

    // Calculate values for headers
    const remaining = Math.max(0, max - record.count);
    const reset = Math.ceil((record.resetTime - now) / 1000); // in seconds

    // Set rate limit headers if enabled
    if (standardHeaders) {
      c.header("X-RateLimit-Limit", max.toString());
      c.header("X-RateLimit-Remaining", remaining.toString());
      c.header("X-RateLimit-Reset", reset.toString());
    }

    // Check if rate limit exceeded
    if (record.count > max) {
      // Set retry-after header
      c.header("Retry-After", reset.toString());

      // Log rate limiting
      c.var.logger?.warn({
        action: "rate_limit_exceeded",
        ip: key,
        count: record.count,
        limit: max,
        window: windowMs,
      });

      // Throw error with appropriate status
      const error = new HTTPException(HttpStatusCodes.TOO_MANY_REQUESTS, {
        res: c.json(
          errorResponse(HttpStatusCodes.TOO_MANY_REQUESTS, message),
          HttpStatusCodes.TOO_MANY_REQUESTS,
        ),
      });
      error.message = message;
      throw error;
    }

    await next();
  };
};

/**
 * Specialized rate limiter for authentication endpoints
 *
 * More strict rate limiting for sensitive operations like login attempts
 * and password reset. Uses both IP address and account identifier (email/username)
 * as the rate limiting key for more precise tracking.
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: "Too many login attempts, please try again later.",
  keyGenerator: async (c: Context) => {
    let ip: string;

    try {
      const connInfo = getConnInfo(c);
      ip =
        c.req.header("x-forwarded-for") ?? connInfo.remote.address ?? "unknown";
    }
    catch {
      // In test environment, fallback to header or default
      ip = c.req.header("x-forwarded-for") ?? "127.0.0.1";
    }

    // Get email or username from request body if available
    let identifier = "";
    try {
      // We need to parse the body manually since we can't use valid() here
      const body = await c.req.raw.json();
      if (body instanceof Promise) {
        body
          .then((parsedBody) => {
            if (parsedBody && typeof parsedBody === "object") {
              const typedBody = parsedBody as Record<string, unknown>;
              if (
                typedBody.email ||
                typedBody.username ||
                typedBody.phoneNumber
              ) {
                identifier = (typedBody.email ||
                  typedBody.username ||
                  typedBody.phoneNumber) as string;
              }
            }
          })
          .catch(() => {
            // Ignore parsing errors
          });
      }
    } catch {
      // Ignore parsing errors and just use IP
    }

    // Combine IP and identifier for more precise rate limiting
    return `${ip}:${identifier}`;
  },
});
