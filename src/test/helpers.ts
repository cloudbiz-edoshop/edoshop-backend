import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppBindings } from "@/lib/types";

/**
 * Helper function to make test requests to the app
 * @param app - The Hono app instance
 * @param path - The request path
 * @param options - Request options
 * @param options.method - HTTP method
 * @param options.headers - Request headers
 * @param options.body - Request body
 */
export async function testRequest(
  app: OpenAPIHono<AppBindings>,
  path: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
) {
  const { method = "GET", headers = {}, body } = options || {};

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  const request = new Request(`http://localhost${path}`, requestInit);

  // Mock env to avoid Node.js specific middleware issues
  const mockEnv = {
    incoming: request,
    outgoing: {
      headers: new Headers(),
    },
  };

  return app.fetch(request, mockEnv);
}

/**
 * Helper to parse JSON response
 */
export async function parseResponse<T = unknown>(response: Response): Promise<T> {
  return response.json();
}
