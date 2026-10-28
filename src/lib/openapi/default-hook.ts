import type { Hook } from "@hono/zod-openapi";

import { formatZodValidationMessage } from "@/lib/format-zod-validation";

import { UNPROCESSABLE_ENTITY } from "../http-status-codes";

const defaultHook: Hook<any, any, any, any> = (result, c) => {
  if (!result.success) {
    const message = formatZodValidationMessage(result.error);
    return c.json(
      {
        success: result.success,
        message,
        error: result.error,
      },
      UNPROCESSABLE_ENTITY,
    );
  }
};

export default defaultHook;
