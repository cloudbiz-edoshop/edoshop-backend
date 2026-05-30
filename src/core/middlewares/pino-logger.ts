import { pinoLogger as logger } from "hono-pino";
import pino from "pino";

import { env } from "@/config";

const transport = pino.transport({
  targets: [
    {
      target: "pino/file",
      options: {
        destination: "./logs/app.log",
        mkdir: true,
      },
    },
    {
      target: "pino-pretty",
      options: {
        destination: process.stdout.fd,
        colorize: true,
      },
    },
  ],
});

/**
 * Pino logger middleware
 *
 * @returns A middleware function that logs requests and responses
 */
export function pinoLogger() {
  return logger({
    pino: pino(
      {
        level: env.LOG_LEVEL || "info",
        name: "api-logger",
        redact: ["password"],
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            // headers: req.headers,
          }),
        },
      },
      transport,
    ),
    http: {
      reqId: () => crypto.randomUUID(),
      async onReqMessage(c) {
        const contentType = c.req.header("content-type") || "";

        // Skip body logging for multipart/form-data (file uploads)
        if (contentType.includes("multipart/form-data")) {
          return "";
        }

        try {
          const req = c.req.raw.clone();
          const body = await req.text();
          if (body) {
            const parsedBody = JSON.parse(body);
            c.var.logger.info({ reqBody: parsedBody }, "Request body");
          }
        } catch {
          // Ignore JSON parse errors for non-JSON bodies
        }

        const query = c.req.query();
        if (Object.keys(query).length > 0) {
          c.var.logger.info({ reqQuery: query }, "Request query");
        }
        return "";
      },
    },
  });
}

export default pinoLogger;
