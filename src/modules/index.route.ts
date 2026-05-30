import type { Context } from "hono";

import { createRoute } from "@hono/zod-openapi";

import { createRouter } from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { jsonContent } from "@/lib/openapi/helpers";
import { createMessageObjectSchema } from "@/lib/openapi/schemas";

/**
 * Index routes for the API
 *
 * Provides basic informational endpoints and health checks for the API.
 */
const router = createRouter()
  /**
   * Root endpoint - Returns API name
   *
   * Simple GET endpoint that confirms the API is running.
   * Returns a basic message with the API name.
   */
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("Edoshop API"),
          "Edoshop API Index",
        ),
      },
    }),
    (c: Context) => {
      return c.json(
        {
          success: true,
          message: "Edoshop API",
        },
        HttpStatusCodes.OK,
      );
    },
  )
  /**
   * Health endpoint - Used by deploy platforms and reverse proxies.
   */
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/health",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("OK"),
          "Health check",
        ),
      },
    }),
    (c: Context) => {
      return c.json({
        success: true,
        message: "OK",
      });
    },
  )
  /**
   * Test endpoint - Simple test endpoint
   *
   * Used for testing that the API can handle requests correctly.
   * Returns a simple test message.
   */
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/test",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("Test API"),
          "Test API Index",
        ),
      },
    }),
    (c: Context) => {
      return c.json({
        message: "Test API",
      });
    },
  );

export default router;
