import type { NotFoundHandler } from "hono";

import { errorResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { NOT_FOUND as NOT_FOUND_MESSAGE } from "@/lib/http-status-phrases";

/**
 * Not found handler middleware
 *
 * @param c - The Hono context object
 * @returns A middleware function that returns a not found response
 */
export const notFound: NotFoundHandler = (c) => {
  const response = errorResponse(
    HttpStatusCodes.NOT_FOUND,
    `${NOT_FOUND_MESSAGE} - ${c.req.path}`,
  );
  return c.json(response, HttpStatusCodes.NOT_FOUND);
};

export default notFound;
