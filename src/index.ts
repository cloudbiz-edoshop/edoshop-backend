/**
 * Application entry point
 *
 * Creates and starts the HTTP server with the configured app.
 * Uses Hono's node-server adapter to serve the application.
 */
import { serve } from "@hono/node-server";

import app from "./app";
import { appConfig } from "./config";

const port = appConfig.port;
// eslint-disable-next-line no-console
console.log(`Server is running on port http://localhost:${port}`);

/**
 * Start the HTTP server
 *
 * Configuration is loaded from environment variables via appConfig
 */
serve({
  fetch: app.fetch,
  port,
});
