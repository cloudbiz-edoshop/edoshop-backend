import { createRoute, z } from "@hono/zod-openapi";

import { createRouter } from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { successResponse } from "@/lib/api-response";
import { jsonContent, jsonContentRequired } from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";

const router = createRouter();

const supportMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(["customer", "support"]),
  text: z.string(),
  createdAt: z.string(),
});

const createSupportMessageSchema = z.object({
  sender: z.enum(["customer", "support"]),
  text: z.string().min(1).max(1000),
});

type SupportMessage = z.infer<typeof supportMessageSchema>;

// Temporary live support thread for local testing until chat persistence is finalized.
const messages: SupportMessage[] = [
  {
    id: "welcome",
    sender: "support",
    text: "Hi! How can I help you today?",
    createdAt: new Date().toISOString(),
  },
];

const listMessagesRoute = createRoute({
  method: "get",
  path: "/support-chat/messages",
  tags: ["Support Chat"],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(supportMessageSchema)),
      "Support chat messages",
    ),
  },
});

const createMessageRoute = createRoute({
  method: "post",
  path: "/support-chat/messages",
  tags: ["Support Chat"],
  request: {
    body: jsonContentRequired(createSupportMessageSchema, "Support chat message"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(supportMessageSchema),
      "Support chat message created",
    ),
  },
});

router.openapi(listMessagesRoute, (async (c) => {
  return c.json(successResponse(messages, "Support chat messages retrieved"));
}) as any);

router.openapi(createMessageRoute, (async (c) => {
  const data = c.req.valid("json");
  const message: SupportMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sender: data.sender,
    text: data.text.trim(),
    createdAt: new Date().toISOString(),
  };

  messages.push(message);

  return c.json(successResponse(message, "Support chat message created"));
}) as any);

export default router;
