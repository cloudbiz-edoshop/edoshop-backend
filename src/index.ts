/**
 * Application entry point
 *
 * Creates and starts the HTTP server with the configured app.
 * Uses Hono's node-server adapter to serve the application.
 */
import { serve } from "@hono/node-server";

import app from "./app";
import { appConfig } from "./config";
import { ensureRuntimeMigrations } from "./db/runtime-migrations";

const port = appConfig.port;

/**
 * Start the HTTP server
 *
 * Configuration is loaded from environment variables via appConfig
 */
async function startServer() {
  await ensureRuntimeMigrations();

  // eslint-disable-next-line no-console
  console.log(`Server is running on port http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port,
  });
}

void startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
