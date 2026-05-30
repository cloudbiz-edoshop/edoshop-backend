import type { AppBindings, AppOpenAPI } from "./types";
import { OpenAPIHono } from "@hono/zod-openapi";

import { cors } from "hono/cors";
import { appConfig } from "@/config";
import { ipAndUserAgent } from "@/core/middlewares";
import { errorHandler, onError } from "@/core/middlewares/error-handler";
import { notFound } from "@/core/middlewares/not-found";
import { pinoLogger } from "@/core/middlewares/pino-logger";

import { serveEmojiFavicon } from "@/core/middlewares/serve-emoji-favicon";

import { defaultHook } from "./openapi";

/**
 * Creates a new OpenAPIHono router with default settings
 *
 * @returns A new OpenAPIHono router instance with default configuration
 */
export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

/**
 * Create and configure a new Hono app with common middleware
 *
 * Sets up CORS, favicon, IP tracking, logging, error handling, and 404 handling
 *
 * @returns A fully configured Hono app instance ready for route registration
 */
export default function createApp() {
  // Create a new app
  const app = createRouter();

  // Apply middleware
  app.use(
    cors({
      origin: appConfig.isProduction ? ["https://edoshop.online"] : "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      exposeHeaders: [
        "Content-Length",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
      ],
      maxAge: 86400,
      credentials: true,
    }),
  );

  // Add security headers
  app.use("*", async (c, next) => {
    // Add security headers
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    if (appConfig.isProduction) {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
      c.header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';",
      );
    }

    await next();
  });

  app.use(serveEmojiFavicon("🚀"));
  app.use(ipAndUserAgent);
  app.use(pinoLogger());

  // Apply error handling middleware
  app.onError(onError);
  app.use(errorHandler);

  // Apply final middleware
  app.notFound(notFound);

  return app;
}

/**
 * Creates a test app by mounting a router on the root path
 *
 * Useful for testing routes in isolation
 *
 * @template R - The router type extending AppOpenAPI
 * @param router - The router instance to mount
 * @returns A configured app with the router mounted at the root path
 */
export function createTestApp<R extends AppOpenAPI>(router: R) {
  return createApp().route("/", router);
}
