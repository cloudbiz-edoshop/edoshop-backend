import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";

import env from "@/config/env.config";
import { FulfillmentMethod } from "@/constants/fulfillment.constants";
import db from "@/db";
import { orders, paymentTransactions } from "@/db/models";
import { buildCustomerOrderTrackingSteps } from "@/modules/orders/order-tracking.util";
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

const supportThreadSchema = z.object({
  id: z.string(),
  latestMessageAt: z.string(),
  latestMessagePreview: z.string(),
  latestCustomerMessagePreview: z.string(),
  latestCustomerMessageAt: z.string().nullable(),
  isEscalated: z.boolean(),
  waitingForHuman: z.boolean(),
  unreadCustomerCount: z.number().int().nonnegative(),
});

const createSupportMessageSchema = z.object({
  sender: z.enum(["customer", "support"]),
  text: z.string().min(1).max(1000),
});

type SupportMessage = z.infer<typeof supportMessageSchema>;
type SupportThreadSummary = z.infer<typeof supportThreadSchema>;
type SupportProductCard = {
  id: number | string;
  title: string;
  price: number | null;
  imageUrl: string;
};

function normalizeReply(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SUPPORT_THREAD_PATTERN = /\[\[EDOSHOP_SUPPORT_THREAD:([^\]]+)\]\]\s*/;
const PRODUCT_CARDS_MARKER_PREFIX = "[[EDOSHOP_PRODUCT_CARDS:";
const PRODUCT_CARDS_MARKER_SUFFIX = "]]";
const SUGGESTIONS_MARKER_PREFIX = "[[EDOSHOP_SUGGESTIONS:";
const SUGGESTIONS_MARKER_SUFFIX = "]]";
const BOT_MARKER = "[[EDOSHOP_BOT]]";
const AGENT_HANDOFF_REQUEST_MARKER = "[[EDOSHOP_AGENT_HANDOFF_REQUEST]]";
const PRODUCT_DISCOVERY_PATTERN = /product|products|catalog|show me|item|items|trending|dropshipping|drop shipping|direct order/i;
const ORDER_TRACKING_INTENT_PATTERN = /\b(track|tracking|where is my order|order status|status of my order|delivery status|shipment status)\b/i;
const AGENT_HANDOFF_PATTERN = /\b(talk to (a )?(human )?agent|live agent|support agent|human support|admin support|connect me to agent|real person|representative)\b/i;
const ORDER_CODE_PATTERN = /\b(ORD-\d{8}-\d{4,})\b/i;
const TRACKING_REFERENCE_PATTERN = /\b(TXN-[A-Z0-9-]{6,}|TRK-[A-Z0-9-]{4,})\b/i;
const NUMERIC_ORDER_ID_PATTERN = /\border\s*(?:id|#)?\s*[:#-]?\s*(\d{1,12})\b/i;
const CONVERSATIONAL_SHORTCUT_PATTERN = /^(hi|hello|hey|yo|thanks?|thank you|thx|ty|gotcha|got it|ok got it|cool thanks|nice thanks|cool|ok|okay|nice|great|awesome|perfect|bye|goodbye|see you|cya|talk later|good night|gn)$/i;

const ORDER_SUGGESTIONS = [
  "Track order ORD-20260705-1234",
  "Show me my recent orders",
  "Where is my delivery",
  "Help me find my order code",
];

const PAYMENT_SUGGESTIONS = [
  "Payment failed at checkout",
  "Card was declined",
  "Campay payment pending",
  "Retry my payment",
];

const ACCOUNT_SUGGESTIONS = [
  "Login troubleshooting steps",
  "OTP code not received",
  "Reset my password",
  "Update my profile",
];

const PRODUCT_SUGGESTIONS = [
  "Show me trending products",
  "Show men products",
  "Show beauty items",
  "Dropshipping products",
];

const GENERAL_SUGGESTIONS = [
  "Track my order",
  "My payment failed",
  "Talk to support agent",
  "Show me products",
];

const AGENT_WAITING_SUGGESTIONS = [
  "Share order code ORD-20260705-1234",
  "Payment failed at checkout",
  "Login troubleshooting steps",
  "Show me products",
];

const KNOWN_SUPPORT_CHIPS = [
  ...ORDER_SUGGESTIONS,
  ...PAYMENT_SUGGESTIONS,
  ...ACCOUNT_SUGGESTIONS,
  ...PRODUCT_SUGGESTIONS,
  ...GENERAL_SUGGESTIONS,
  ...AGENT_WAITING_SUGGESTIONS,
];

const KNOWN_SUPPORT_CHIPS_NORMALIZED = new Set(
  KNOWN_SUPPORT_CHIPS.map((chip) => normalizeReply(chip)),
);

const getThreadIdFromText = (text: string) => {
  const match = String(text).match(SUPPORT_THREAD_PATTERN);
  return match?.[1] || "";
};

const stripThreadMarker = (text: string) => {
  return String(text)
    .replace(SUPPORT_THREAD_PATTERN, "")
    .replace(/\[\[EDOSHOP_PRODUCT_CARDS:[^\]]+\]\]/g, "")
    .replace(/\[\[EDOSHOP_SUGGESTIONS:[^\]]+\]\]/g, "")
    .replace(BOT_MARKER, "")
    .replace(AGENT_HANDOFF_REQUEST_MARKER, "")
    .trim();
};

const withThreadMarker = (text: string, threadId: string) => {
  if (!threadId) return text;
  return `[[EDOSHOP_SUPPORT_THREAD:${threadId}]]\n${text}`;
};

const withProductCardsMarker = (text: string, cards: SupportProductCard[]) => {
  if (!cards.length) return text;

  const encodedCards = Buffer.from(JSON.stringify(cards)).toString("base64");
  return `${text}\n${PRODUCT_CARDS_MARKER_PREFIX}${encodedCards}${PRODUCT_CARDS_MARKER_SUFFIX}`;
};

const withBotMarker = (text: string) => `${BOT_MARKER}${text}`;

const isBotMessage = (text: string) => String(text || "").includes(BOT_MARKER);

const withAgentHandoffMarker = (text: string) => `${AGENT_HANDOFF_REQUEST_MARKER}${text}`;

const buildSupportThreads = (allMessages: SupportMessage[]): SupportThreadSummary[] => {
  const threadMap = new Map<string, SupportThreadSummary & { latestMessageText: string }>();

  allMessages.forEach((message) => {
    const threadId = getThreadIdFromText(message.text);
    if (!threadId) return;

    const existing = threadMap.get(threadId);
    const cleanedText = stripThreadMarker(message.text);
    const latestAt = message.createdAt;

    if (!existing) {
      threadMap.set(threadId, {
        id: threadId,
        latestMessageAt: latestAt,
        latestMessagePreview: cleanedText,
        latestCustomerMessagePreview: message.sender === "customer" ? cleanedText : "",
        latestCustomerMessageAt: message.sender === "customer" ? latestAt : null,
        isEscalated: escalatedThreads.has(threadId),
        waitingForHuman: escalatedThreads.has(threadId),
        unreadCustomerCount: message.sender === "customer" ? 1 : 0,
        latestMessageText: message.text,
      });
      return;
    }

    const isNewer = new Date(latestAt) >= new Date(existing.latestMessageAt);
    if (isNewer) {
      existing.latestMessageAt = latestAt;
      existing.latestMessagePreview = cleanedText;
      existing.latestMessageText = message.text;
    }

    if (message.sender === "customer") {
      existing.latestCustomerMessagePreview = cleanedText;
      existing.latestCustomerMessageAt = latestAt;
      existing.unreadCustomerCount += 1;
    }

    existing.isEscalated = escalatedThreads.has(threadId);
    existing.waitingForHuman = escalatedThreads.has(threadId);
  });

  return Array.from(threadMap.values())
    .sort((left, right) => {
      if (left.isEscalated !== right.isEscalated) {
        return left.isEscalated ? -1 : 1;
      }
      return new Date(right.latestMessageAt).getTime() - new Date(left.latestMessageAt).getTime();
    })
    .map(({ latestMessageText: _ignored, ...thread }) => thread);
};

const withSuggestionsMarker = (text: string, suggestions: string[]) => {
  const uniqueSuggestions = [...new Set((suggestions || []).filter(Boolean))].slice(0, 4);
  if (!uniqueSuggestions.length) return text;

  const encodedSuggestions = Buffer.from(JSON.stringify(uniqueSuggestions)).toString("base64");
  return `${text}\n${SUGGESTIONS_MARKER_PREFIX}${encodedSuggestions}${SUGGESTIONS_MARKER_SUFFIX}`;
};

const getIntentSuggestions = (message: string) => {
  const normalized = String(message || "").toLowerCase();

  if (/order|track|status|delivery|shipping|shipment/.test(normalized)) {
    return ORDER_SUGGESTIONS;
  }

  if (/payment|campay|stripe|card|checkout|declin|transaction/.test(normalized)) {
    return PAYMENT_SUGGESTIONS;
  }

  if (/login|sign in|signin|otp|password|profile|account/.test(normalized)) {
    return ACCOUNT_SUGGESTIONS;
  }

  if (/product|products|catalog|item|items|trending|dropshipping|drop shipping/.test(normalized)) {
    return PRODUCT_SUGGESTIONS;
  }

  return GENERAL_SUGGESTIONS;
};

const resolveProductImageUrl = (url: string | null | undefined) => {
  if (!url) return "/img/shirt.png";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return url;
  return `http://localhost:${env.PORT}/api/images/${url}`;
};

const getSupportProductCards = async (query: string): Promise<SupportProductCard[]> => {
  try {
    const response = await fetch(
      `http://localhost:${env.PORT}/v1/public/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc`,
    );

    if (!response.ok) return [];

    const result = await response.json();
    const products = Array.isArray(result?.data) ? result.data : [];
    const normalizedQuery = query.toLowerCase();
    const categoryHints = ["men", "women", "beauty", "accessories", "shoes", "bags"];
    const matchedHint = categoryHints.find((hint) => normalizedQuery.includes(hint));

    const filteredProducts = matchedHint
      ? products.filter((product: any) =>
          `${product?.name || ""} ${(product?.categories || [])
            .map((category: any) => category?.name || "")
            .join(" ")}`
            .toLowerCase()
            .includes(matchedHint),
        )
      : products;

    return filteredProducts.slice(0, 4).map((product: any) => ({
      id: product?.id,
      title: product?.name || "Product",
      price: Number.isFinite(Number(product?.price)) ? Number(product.price) : null,
      imageUrl: resolveProductImageUrl(
        product?.imageUrls?.find?.(Boolean)
        || product?.imageUrl
        || product?.variants?.[0]?.images?.[0]?.imageUrl
        || product?.variants?.[0]?.images?.[0],
      ),
    }));
  } catch {
    return [];
  }
};

const buildProductCardsReply = async (query: string) => {
  const cards = await getSupportProductCards(query);

  if (!cards.length) {
    return withSuggestionsMarker(
      "I could not load products right now. Please try again in a moment.",
      PRODUCT_SUGGESTIONS,
    );
  }

  const normalizedQuery = query.toLowerCase();
  const intro = /dropshipping|drop shipping/.test(normalizedQuery)
    ? "Here are some dropshipping picks you can open right now:"
    : "Here are some products you can open right now:";

  return withSuggestionsMarker(
    withProductCardsMarker(intro, cards),
    PRODUCT_SUGGESTIONS,
  );
};

const getTrackingReferenceFromMessage = (message: string) => {
  const normalized = String(message || "").toUpperCase();

  const orderCodeMatch = normalized.match(ORDER_CODE_PATTERN);
  if (orderCodeMatch?.[1]) {
    return { kind: "orderCode" as const, value: orderCodeMatch[1] };
  }

  const trackingRefMatch = normalized.match(TRACKING_REFERENCE_PATTERN);
  if (trackingRefMatch?.[1]) {
    return { kind: "trackingRef" as const, value: trackingRefMatch[1] };
  }

  const numericIdMatch = normalized.match(NUMERIC_ORDER_ID_PATTERN);
  if (numericIdMatch?.[1]) {
    return { kind: "orderId" as const, value: numericIdMatch[1] };
  }

  return null;
};

const formatTrackingDate = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAddress = (
  address:
    | {
      streetAddress?: string | null;
      landmark?: string | null;
      country?: { name?: string | null } | null;
    }
    | null
    | undefined,
) => {
  if (!address) return "";
  return [address.streetAddress, address.landmark, address.country?.name]
    .filter(Boolean)
    .join(", ");
};

const resolveTrackingLocation = (order: any) => {
  if (order.fulfillmentMethod === FulfillmentMethod.PICKUP) {
    return [
      order.pickupWarehouse?.name,
      formatAddress(order.pickupWarehouse?.address),
    ]
      .filter(Boolean)
      .join(" - ");
  }

  return formatAddress(order.shippingAddress) || "Delivery in progress";
};

const resolveEta = (order: any, currentStepLabel: string) => {
  const status = String(order?.orderStatus?.name || "").toLowerCase();
  if (/deliver/.test(status)) {
    return "Delivered";
  }

  if (order.fulfillmentMethod === FulfillmentMethod.PICKUP) {
    if (/ready/.test(status) || /pickup/.test(currentStepLabel.toLowerCase())) {
      return "Ready for pickup soon";
    }
    return "Estimated 1-2 days";
  }

  if (/shipp|dispatch|pack/.test(status)) {
    return "Estimated 1-3 days";
  }

  return "Estimated 2-5 days";
};

const buildAgentHandoffReply = () => {
  return withAgentHandoffMarker(
    withSuggestionsMarker(
      "Understood. I have notified a human support agent. They will reply here soon. While you wait, you can share your order code or exact error to speed things up.",
      AGENT_WAITING_SUGGESTIONS,
    ),
  );
};

const buildEscalatedWaitingReply = (
  customerMessage: string,
  recentMessages: SupportMessage[],
) => {
  const cleanedMessage = stripThreadMarker(customerMessage).toLowerCase().trim();
  const intentSuggestions = getIntentSuggestions(cleanedMessage);
  const filteredSuggestions = intentSuggestions.filter(
    (suggestion) => normalizeReply(suggestion) !== normalizeReply(cleanedMessage),
  );
  const nextSuggestions = filteredSuggestions.length
    ? filteredSuggestions
    : intentSuggestions;

  let baseReply = "A human support agent has been notified and will reply here soon. I have added your latest message to the ticket.";

  if (/\blogin\b|sign in|signin|log in|can't login|cannot login|otp|password|profile|account/.test(cleanedMessage)) {
    baseReply = "I have shared your account/login issue with the human support agent. While you wait, please keep the exact error text ready so they can resolve faster.";
  } else if (/payment|campay|stripe|card|checkout|failed|declin/.test(cleanedMessage)) {
    baseReply = "I have shared your payment issue with the human support agent. While you wait, please keep the method used and exact error text ready for quick resolution.";
  } else if (/order|track|status|delivery|shipping|shipment/.test(cleanedMessage)) {
    baseReply = "I have shared your order/tracking request with the human support agent. If you have your order code (ORD-...), send it now to speed up the response.";
  } else if (/product|products|catalog|item|items|trending|dropshipping|drop shipping/.test(cleanedMessage)) {
    baseReply = "I have shared your product request with the human support agent. You can also send your preferred category to get a faster recommendation.";
  } else if (CONVERSATIONAL_SHORTCUT_PATTERN.test(cleanedMessage)) {
    baseReply = "Thanks. Your conversation is still queued for a human support agent, and they will reply here shortly.";
  }

  const fullReply = withSuggestionsMarker(baseReply, nextSuggestions);
  const lastSupportText = stripThreadMarker(
    [...recentMessages]
      .reverse()
      .find((item) => item.sender === "support")?.text || "",
  );

  if (normalizeReply(stripThreadMarker(fullReply)) === normalizeReply(lastSupportText)) {
    return withSuggestionsMarker(
      "Update received. I have attached it to your existing support ticket. A human support agent will reply here soon.",
      nextSuggestions,
    );
  }

  return fullReply;
};

const getSupportOrderTrackingReply = async (message: string) => {
  const reference = getTrackingReferenceFromMessage(message);

  if (!reference) {
    return withSuggestionsMarker(
      "I can track this for you. Please send your order code (example: ORD-20260705-1234) or tracking reference.",
      ORDER_SUGGESTIONS,
    );
  }

  try {
    let order: any = null;

    if (reference.kind === "orderCode") {
      order = await db.query.orders.findFirst({
        where: and(
          eq(orders.orderCode, reference.value),
          eq(orders.isDeleted, false),
        ),
        with: {
          orderStatus: true,
          paymentTransactions: {
            with: {
              paymentStatus: true,
            },
          },
          shippingAddress: {
            with: {
              country: true,
            },
          },
          pickupWarehouse: {
            with: {
              address: {
                with: {
                  country: true,
                },
              },
            },
          },
        },
      });
    }

    if (!order && reference.kind === "orderId") {
      const numericOrderId = Number(reference.value);
      if (Number.isFinite(numericOrderId)) {
        order = await db.query.orders.findFirst({
          where: and(
            eq(orders.id, numericOrderId),
            eq(orders.isDeleted, false),
          ),
          with: {
            orderStatus: true,
            paymentTransactions: {
              with: {
                paymentStatus: true,
              },
            },
            shippingAddress: {
              with: {
                country: true,
              },
            },
            pickupWarehouse: {
              with: {
                address: {
                  with: {
                    country: true,
                  },
                },
              },
            },
          },
        });
      }
    }

    if (!order && reference.kind === "trackingRef") {
      const paymentTx = await db.query.paymentTransactions.findFirst({
        where: and(
          eq(paymentTransactions.transactionReference, reference.value),
          eq(paymentTransactions.isDeleted, false),
        ),
        with: {
          order: {
            with: {
              orderStatus: true,
              paymentTransactions: {
                with: {
                  paymentStatus: true,
                },
              },
              shippingAddress: {
                with: {
                  country: true,
                },
              },
              pickupWarehouse: {
                with: {
                  address: {
                    with: {
                      country: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      order = paymentTx?.order || null;
    }

    if (!order) {
      return withSuggestionsMarker(
        "I could not find an order with that reference. Please check and resend your order code (ORD-...) or tracking reference.",
        ORDER_SUGGESTIONS,
      );
    }

    const paymentStatus = order.paymentTransactions?.[0]?.paymentStatus?.name || "pending";
    const steps = buildCustomerOrderTrackingSteps({
      statusId: order.statusId,
      fulfillmentMethod: order.fulfillmentMethod ?? FulfillmentMethod.DELIVERY,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
    const currentStep =
      steps.find((step) => step.active)
      || steps.filter((step) => step.completed).slice(-1)[0];
    const lastUpdated = formatTrackingDate(order.updatedAt || order.createdAt);
    const eta = resolveEta(order, currentStep?.label || "");
    const location = resolveTrackingLocation(order);

    return `Tracking update for ${order.orderCode}: status is ${order.orderStatus?.name || "pending"}. Current stage: ${currentStep?.label || "Order Placed"}. Payment: ${paymentStatus}. Last update: ${lastUpdated}. ETA: ${eta}. ${location ? `Location: ${location}.` : ""}`;
  } catch {
    return "I could not retrieve tracking right now. Please try again in a moment.";
  }
};

const buildRuleBasedReply = (message: string) => {
  const normalized = message.toLowerCase();

  if (/^thanks?$|^thank you$|^thx$|^ty$|thank\b|thank you so much|thanks a lot|gotcha|got it|ok got it|cool thanks|nice thanks/.test(normalized)) {
    return "You are welcome. If you want, I can also help you with orders, payments, account settings, or product discovery.";
  }

  if (/^cool$|^ok$|^okay$|^nice$|^great$|^awesome$|^perfect$/.test(normalized)) {
    return withSuggestionsMarker(
      "Nice. Want to continue with anything else?",
      GENERAL_SUGGESTIONS,
    );
  }

  if (/\b(shit|damn|wtf|fuck|f\*\*\*)\b/.test(normalized)) {
    return withSuggestionsMarker(
      "I understand this is frustrating. I can help fix it quickly. Share the exact error, or choose one option below.",
      getIntentSuggestions(normalized),
    );
  }

  if (/^bye$|^goodbye$|see you|cya|talk later|good night|gn$/.test(normalized)) {
    return "Bye for now. I am here whenever you need help with orders, payments, account, or products.";
  }

  if (/^hi$|^hello$|^hey$|^yo$/.test(normalized)) {
    return withSuggestionsMarker(
      "Welcome. Choose a quick option below, or tell me your issue directly.",
      GENERAL_SUGGESTIONS,
    );
  }

  if (/\blogin\b|sign in|signin|log in|can't login|cannot login/.test(normalized)) {
    return withSuggestionsMarker(
      "For login issues, please try this: 1) confirm the same phone/email used at signup, 2) verify country code on phone number, 3) use Forgot Password to reset, 4) retry after clearing browser cache. If it still fails, send the exact error text and whether you are on mobile or web.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/^otp$|code not received|verification code|one time password/.test(normalized)) {
    return withSuggestionsMarker(
      "For OTP issues: 1) check the phone number format with country code, 2) wait 30-60 seconds and resend once, 3) ensure WhatsApp/SMS network is stable. If OTP still does not arrive, share the phone number mask and timestamp so support can trace delivery.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/password reset|forgot password|reset password/.test(normalized)) {
    return withSuggestionsMarker(
      "To reset password: open Forgot Password, request OTP, then set a new password with at least 8 characters. If reset fails, share the exact error and at which step it fails (request OTP, verify OTP, or submit new password).",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/profile|account settings|update profile|photo upload/.test(normalized)) {
    return withSuggestionsMarker(
      "For profile/account settings issues, tell me which field fails (name, phone, photo, email) and whether the Save action shows an error toast. I will give exact steps from there.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/payment|campay|stripe|card|checkout|failed|declin/.test(normalized)) {
    return withSuggestionsMarker(
      "I can help with payment issues. Please share what you selected (Campay or card), the exact error text, and approximately when it happened so we can guide you quickly.",
      PAYMENT_SUGGESTIONS,
    );
  }

  if (/group|dropshipping|drop shipping|ongoing/.test(normalized)) {
    return withSuggestionsMarker(
      "For group and dropshipping support, share the product or group request context and what action failed. I will guide the next step right away.",
      PRODUCT_SUGGESTIONS,
    );
  }

  if (/order|track|status|delivery|shipping|where/.test(normalized)) {
    return withSuggestionsMarker(
      "I can help you check your order. Please send your order code (ORD-...) or tracking reference, and I will fetch the latest tracking status.",
      ORDER_SUGGESTIONS,
    );
  }

  if (/account|login|otp|password|profile/.test(normalized)) {
    return withSuggestionsMarker(
      "I can help with account access. Tell me if this is login, OTP, password reset, or profile update so I can give the exact next steps.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/product|products|catalog|show me|item|items/.test(normalized)) {
    return withSuggestionsMarker(
      "Sure. Tell me what you want to browse: direct-order or dropshipping, and optionally a category like men, women, beauty, or accessories.",
      PRODUCT_SUGGESTIONS,
    );
  }

  return withSuggestionsMarker(
    "I am not fully sure yet. Share the exact issue or choose one of these quick options so I can help faster.",
    getIntentSuggestions(normalized),
  );
};

const buildChatHistory = (recentMessages: SupportMessage[]) =>
  recentMessages
    .slice(-10)
    .map((item) => `${item.sender}: ${stripThreadMarker(item.text)}`)
    .join("\n");

const buildSupportPrompt = (cleanedMessage: string, recentMessages: SupportMessage[]) => ({
  system:
    "You are Edoshop support. Keep answers short, practical, and commerce-focused. If information is missing, ask one concise follow-up question. If user says thanks/thank you, reply with a short polite closure instead of restarting generic help options.",
  user: `Recent chat:\n${buildChatHistory(recentMessages)}\n\nCurrent customer message:\n${cleanedMessage}`,
});

const callOpenAi = async (cleanedMessage: string, recentMessages: SupportMessage[]) => {
  const prompt = buildSupportPrompt(cleanedMessage, recentMessages);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!response.ok) return "";
  const result = await response.json();
  return result?.choices?.[0]?.message?.content?.trim() || "";
};

const callOllama = async (cleanedMessage: string, recentMessages: SupportMessage[]) => {
  const prompt = buildSupportPrompt(cleanedMessage, recentMessages);
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL || "llama3.1:8b",
      stream: false,
      options: {
        temperature: 0.2,
      },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });

  if (!response.ok) return "";
  const result = await response.json();
  return result?.message?.content?.trim() || "";
};

const createAiReply = async (
  customerMessage: string,
  recentMessages: SupportMessage[],
) => {
  const cleanedMessage = stripThreadMarker(customerMessage);
  if (!cleanedMessage) {
    return "Please share a bit more detail so I can help you faster.";
  }

  if (AGENT_HANDOFF_PATTERN.test(cleanedMessage)) {
    return buildAgentHandoffReply();
  }

  if (CONVERSATIONAL_SHORTCUT_PATTERN.test(cleanedMessage.trim())) {
    return buildRuleBasedReply(cleanedMessage);
  }

  if (PRODUCT_DISCOVERY_PATTERN.test(cleanedMessage)) {
    return buildProductCardsReply(cleanedMessage);
  }

  if (ORDER_TRACKING_INTENT_PATTERN.test(cleanedMessage)) {
    return getSupportOrderTrackingReply(cleanedMessage);
  }

  if (env.AI_PROVIDER === "rules") {
    return buildRuleBasedReply(cleanedMessage);
  }

  // Keep a deterministic, polite closure for gratitude messages.
  if (/^thanks?$|^thank you$|^thx$|^ty$|thank\b|thank you so much|thanks a lot|gotcha|got it|ok got it|cool thanks|nice thanks|cool|ok|okay|nice|great|awesome|perfect/i.test(cleanedMessage)) {
    return "You are welcome. If you need anything else, I am here to help.";
  }

  if (/^bye$|^goodbye$|see you|cya|talk later|good night|gn$/i.test(cleanedMessage)) {
    return "Bye for now. I am here whenever you need help again.";
  }

  try {
    const provider = env.AI_PROVIDER || "auto";
    let text = "";

    if (provider === "openai") {
      text = await callOpenAi(cleanedMessage, recentMessages);
    } else if (provider === "ollama") {
      text = await callOllama(cleanedMessage, recentMessages);
    } else if (provider === "auto") {
      if (env.OPENAI_API_KEY) {
        text = await callOpenAi(cleanedMessage, recentMessages);
      }
      if (!text) {
        text = await callOllama(cleanedMessage, recentMessages);
      }
    }

    const replyText = text || buildRuleBasedReply(cleanedMessage);
    const lastSupportText = stripThreadMarker(
      [...recentMessages]
        .reverse()
        .find((item) => item.sender === "support")?.text || "",
    );

    if (normalizeReply(replyText) === normalizeReply(lastSupportText)) {
      return withSuggestionsMarker(
        "Got it. I need one more detail to be accurate. Please share the exact error message or tap one of these options.",
        getIntentSuggestions(cleanedMessage),
      );
    }

    return replyText;
  } catch {
    const fallbackReply = buildRuleBasedReply(cleanedMessage);
    const lastSupportText = stripThreadMarker(
      [...recentMessages]
        .reverse()
        .find((item) => item.sender === "support")?.text || "",
    );

    if (normalizeReply(fallbackReply) === normalizeReply(lastSupportText)) {
      return withSuggestionsMarker(
        "Understood. Please share the exact error text and which step fails, or use one of these options.",
        getIntentSuggestions(cleanedMessage),
      );
    }

    return fallbackReply;
  }
};

const createMessage = (sender: "customer" | "support", text: string): SupportMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  sender,
  text: text.trim(),
  createdAt: new Date().toISOString(),
});

// Temporary live support thread for local testing until chat persistence is finalized.
const escalatedThreads = new Set<string>();
const escalatedThreadLastAckAt = new Map<string, number>();
const escalatedThreadLastCustomerText = new Map<string, string>();

const messages: SupportMessage[] = [
  {
    id: "welcome",
    sender: "support",
    text: withBotMarker(withSuggestionsMarker(
      "Pick an option to get started, or type your issue.",
      GENERAL_SUGGESTIONS,
    )),
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

const listThreadsRoute = createRoute({
  method: "get",
  path: "/support-chat/threads",
  tags: ["Support Chat"],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(supportThreadSchema)),
      "Support chat threads",
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

router.openapi(listThreadsRoute, (async (c) => {
  return c.json(successResponse(buildSupportThreads(messages), "Support chat threads retrieved"));
}) as any);

router.openapi(createMessageRoute, (async (c) => {
  const data = c.req.valid("json");
  const message = createMessage(data.sender, data.text);
  const threadId = getThreadIdFromText(message.text);

  messages.push(message);

  if (message.sender === "support") {
    if (threadId && !isBotMessage(message.text)) {
      escalatedThreads.delete(threadId);
      escalatedThreadLastAckAt.delete(threadId);
      escalatedThreadLastCustomerText.delete(threadId);
    }

    return c.json(successResponse(message, "Support chat message created"));
  }

  if (message.sender === "customer") {
    if (threadId && escalatedThreads.has(threadId)) {
      const normalizedCustomerMessage = normalizeReply(stripThreadMarker(message.text));
      const now = Date.now();
      const lastAckAt = escalatedThreadLastAckAt.get(threadId) || 0;
      const lastCustomerMessage = escalatedThreadLastCustomerText.get(threadId) || "";
      const isKnownChipClick = KNOWN_SUPPORT_CHIPS_NORMALIZED.has(normalizedCustomerMessage);
      const isRepeatedMessage = normalizedCustomerMessage === lastCustomerMessage;
      const shouldSuppressReply = (
        (isKnownChipClick && now - lastAckAt < 60_000)
        || (isRepeatedMessage && now - lastAckAt < 120_000)
      );

      escalatedThreadLastCustomerText.set(threadId, normalizedCustomerMessage);

      if (shouldSuppressReply) {
        return c.json(successResponse(message, "Support chat message created"));
      }

      const relevantMessages = messages.filter((item) => getThreadIdFromText(item.text) === threadId);
      const waitingReplyText = buildEscalatedWaitingReply(message.text, relevantMessages);
      const waitingReply = createMessage(
        "support",
        withThreadMarker(
          withBotMarker(
            waitingReplyText,
          ),
          threadId,
        ),
      );
      messages.push(waitingReply);
      escalatedThreadLastAckAt.set(threadId, now);
      return c.json(successResponse(message, "Support chat message created"));
    }

    const relevantMessages = threadId
      ? messages.filter((item) => getThreadIdFromText(item.text) === threadId)
      : messages;

    const replyText = await createAiReply(message.text, relevantMessages);

    if (threadId && replyText.includes(AGENT_HANDOFF_REQUEST_MARKER)) {
      escalatedThreads.add(threadId);
      escalatedThreadLastAckAt.set(threadId, Date.now());
      escalatedThreadLastCustomerText.set(threadId, normalizeReply(stripThreadMarker(message.text)));
    }

    const supportReply = createMessage(
      "support",
      withThreadMarker(withBotMarker(replyText), threadId),
    );

    messages.push(supportReply);
  }

  return c.json(successResponse(message, "Support chat message created"));
}) as any);

export default router;
