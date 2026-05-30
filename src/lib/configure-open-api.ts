import type { AppOpenAPI } from "./types";

import { apiReference } from "@scalar/hono-api-reference";

import packageJSON from "../../package.json" with { type: "json" };

/**
 * Configures OpenAPI documentation and API reference UI for the application
 *
 * Sets up the OpenAPI specification endpoint at /doc and the Scalar API reference UI at /reference.
 * Includes JWT authentication schema configuration in the OpenAPI registry.
 *
 * @param app - The Hono app instance to configure
 */
export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Edoshop API",
    },
  });
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.get(
    "/reference",
    apiReference({
      url: "/doc",
      theme: "kepler",
      // layout: "classic",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch",
      },
      authentication: {
        preferredSecurityScheme: "Bearer",
        securitySchemes: {
          Bearer: {
            token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibmFiZWVsIiwiaWF0IjoxNzQyOTgxNjgyLCJleHAiOjE3NzQ1MTc2NjN9.iUNAeWjdD-UykeQY7vv4bmFA1JI67mHgYcNZ8mW0ZRo",
          },
        },
      },
    }),
  );
}
