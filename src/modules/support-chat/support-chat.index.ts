import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, inArray } from "drizzle-orm";

import env from "@/config/env.config";
import { EntityType, OperationType } from "@/constants";
import { FulfillmentMethod } from "@/constants/fulfillment.constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import db from "@/db";
import { customers, orders, paymentTransactions } from "@/db/models";
import { buildCustomerOrderTrackingSteps } from "@/modules/orders/order-tracking.util";
import { createRouter } from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { successResponse } from "@/lib/api-response";
import { jsonContent, jsonContentRequired } from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas/common-schemas";

const router = createRouter();

const supportMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(["customer", "support"]),
  text: z.string(),
  createdAt: z.string(),
  customerFirstName: z.string().optional(),
  customerId: z.string().optional(),
  visitorId: z.string().optional(),
  threadId: z.string().optional(),
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
  customerFirstName: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  customerCode: z.string().nullable().optional(),
  customerRecordId: z.number().nullable().optional(),
});

const createCustomerSupportMessageSchema = z.object({
  sender: z.literal("customer"),
  text: z.string().min(1).max(2000),
  customerFirstName: z.string().trim().min(1).max(100).optional(),
  customerId: z.union([z.string(), z.number()]).optional(),
  visitorId: z.string().optional(),
  threadId: z.string().optional(),
});

const createAdminSupportMessageSchema = z.object({
  sender: z.literal("support"),
  text: z.string().min(1).max(2000),
});

type SupportMessage = z.infer<typeof supportMessageSchema>;
type SupportThreadSummary = z.infer<typeof supportThreadSchema>;
type SupportMessageMetadata = Pick<
  SupportMessage,
  "customerFirstName" | "customerId" | "visitorId" | "threadId"
>;
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
const ATTACHMENT_MARKER_PREFIX = "[[EDOSHOP_ATTACHMENT:";
const ATTACHMENT_MARKER_SUFFIX = "]]";
const LEGACY_ATTACHMENT_PATTERN = /^Attachment:\s*(.+?)\n(https?:\/\/\S+)/im;
const PRODUCT_DISCOVERY_PATTERN =
  /product|products|catalog|show me|item|items|trending|dropshipping|drop shipping|direct order/i;
const ORDER_TRACKING_INTENT_PATTERN =
  /\b(track|tracking|where is my order|order status|status of my order|delivery status|shipment status)\b/i;
const AGENT_HANDOFF_PATTERN =
  /\b(talk to (a )?(human )?agent|live agent|support agent|human support|admin support|connect me to agent|real person|representative)\b/i;
const ORDER_CODE_PATTERN = /\b(ORD-\d{8}-\d{4,})\b/i;
const TRACKING_REFERENCE_PATTERN = /\b(TXN-[A-Z0-9-]{6,}|TRK-[A-Z0-9-]{4,})\b/i;
const NUMERIC_ORDER_ID_PATTERN = /\border\s*(?:id|#)?\s*[:#-]?\s*(\d{1,12})\b/i;
const CONVERSATIONAL_SHORTCUT_PATTERN =
  /^(hi|hello|hey|yo|thanks?|thank you|thx|ty|gotcha|got it|ok got it|cool thanks|nice thanks|cool|ok|okay|nice|great|awesome|perfect|bye|goodbye|see you|cya|talk later|good night|gn)$/i;

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
    .replace(/\[\[EDOSHOP_ATTACHMENT:[^\]]+\]\]/g, "")
    .replace(LEGACY_ATTACHMENT_PATTERN, "")
    .replace(BOT_MARKER, "")
    .replace(AGENT_HANDOFF_REQUEST_MARKER, "")
    .trim();
};

type SupportAttachment = {
  fileName?: string;
  url: string;
  mimeType?: string;
};

const parseSupportAttachment = (text: string): SupportAttachment | null => {
  const raw = String(text || "");
  const markerMatch = raw.match(/\[\[EDOSHOP_ATTACHMENT:([^\]]+)\]\]/);

  if (markerMatch?.[1]) {
    try {
      const parsed = JSON.parse(
        Buffer.from(markerMatch[1], "base64").toString("utf8"),
      );
      if (parsed?.url) {
        return {
          fileName: parsed.fileName,
          url: parsed.url,
          mimeType: parsed.mimeType,
        };
      }
    } catch {
      return null;
    }
  }

  const legacyMatch = raw.match(LEGACY_ATTACHMENT_PATTERN);
  if (legacyMatch) {
    return {
      fileName: legacyMatch[1]?.trim(),
      url: legacyMatch[2]?.trim(),
    };
  }

  return null;
};

const buildAttachmentReply = () =>
  withAgentHandoffMarker(
    "Thank you — we've received your attachment. A member of our team will review it and reply here shortly.",
  );

const getMessagePreview = (text: string) => {
  const attachment = parseSupportAttachment(text);
  if (attachment) {
    return attachment.fileName
      ? `Attachment: ${attachment.fileName}`
      : "Image attachment";
  }

  return stripThreadMarker(text);
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

const withAgentHandoffMarker = (text: string) =>
  `${AGENT_HANDOFF_REQUEST_MARKER}${text}`;

type CustomerProfile = {
  customerCode: string;
  customerRecordId: number;
};

const resolveCustomerProfilesByUserIds = async (
  userIds: string[],
): Promise<Map<string, CustomerProfile>> => {
  const parsedIds = [...new Set(userIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!parsedIds.length) return new Map();

  const rows = await db.query.customers.findMany({
    where: inArray(customers.userId, parsedIds),
    columns: { id: true, userId: true, customerCode: true },
  });

  return new Map(
    rows.map((row) => [
      String(row.userId),
      { customerCode: row.customerCode, customerRecordId: row.id },
    ]),
  );
};

const buildSupportThreads = async (
  allMessages: SupportMessage[],
): Promise<SupportThreadSummary[]> => {
  const threadMap = new Map<
    string,
    SupportThreadSummary & { latestMessageText: string }
  >();

  allMessages.forEach((message) => {
    const threadId = getThreadIdFromText(message.text);
    if (!threadId) return;

    const existing = threadMap.get(threadId);
    const cleanedText = getMessagePreview(message.text);
    const latestAt = message.createdAt;

    if (!existing) {
      threadMap.set(threadId, {
        id: threadId,
        latestMessageAt: latestAt,
        latestMessagePreview: cleanedText,
        latestCustomerMessagePreview:
          message.sender === "customer" ? cleanedText : "",
        latestCustomerMessageAt:
          message.sender === "customer" ? latestAt : null,
        isEscalated: escalatedThreads.has(threadId),
        waitingForHuman: escalatedThreads.has(threadId),
        unreadCustomerCount: message.sender === "customer" ? 1 : 0,
        latestMessageText: message.text,
        customerFirstName:
          message.sender === "customer"
            ? message.customerFirstName ?? null
            : null,
        customerId:
          message.sender === "customer" ? message.customerId ?? null : null,
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
      if (message.customerFirstName) {
        existing.customerFirstName = message.customerFirstName;
      }
      if (message.customerId) {
        existing.customerId = message.customerId;
      }
    }

    existing.isEscalated = escalatedThreads.has(threadId);
    existing.waitingForHuman = escalatedThreads.has(threadId);
  });

  const sortedThreads = Array.from(threadMap.values()).sort((left, right) => {
    if (left.isEscalated !== right.isEscalated) {
      return left.isEscalated ? -1 : 1;
    }
    return (
      new Date(right.latestMessageAt).getTime() -
      new Date(left.latestMessageAt).getTime()
    );
  });

  const profileMap = await resolveCustomerProfilesByUserIds(
    sortedThreads
      .map((thread) => thread.customerId)
      .filter((value): value is string => Boolean(value)),
  );

  return sortedThreads.map(({ latestMessageText: _ignored, ...thread }) => {
    const profile = thread.customerId
      ? profileMap.get(thread.customerId)
      : undefined;

    return {
      ...thread,
      customerCode: profile?.customerCode ?? null,
      customerRecordId: profile?.customerRecordId ?? null,
    };
  });
};

const withSuggestionsMarker = (text: string, suggestions: string[]) => {
  const uniqueSuggestions = [
    ...new Set((suggestions || []).filter(Boolean)),
  ].slice(0, 4);
  if (!uniqueSuggestions.length) return text;

  const encodedSuggestions = Buffer.from(
    JSON.stringify(uniqueSuggestions),
  ).toString("base64");
  return `${text}\n${SUGGESTIONS_MARKER_PREFIX}${encodedSuggestions}${SUGGESTIONS_MARKER_SUFFIX}`;
};

const getIntentSuggestions = (message: string) => {
  const normalized = String(message || "").toLowerCase();

  if (/order|track|status|delivery|shipping|shipment/.test(normalized)) {
    return ORDER_SUGGESTIONS;
  }

  if (
    /payment|campay|stripe|card|checkout|declin|transaction/.test(normalized)
  ) {
    return PAYMENT_SUGGESTIONS;
  }

  if (/login|sign in|signin|otp|password|profile|account/.test(normalized)) {
    return ACCOUNT_SUGGESTIONS;
  }

  if (
    /product|products|catalog|item|items|trending|dropshipping|drop shipping/.test(
      normalized,
    )
  ) {
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

const getSupportProductCards = async (
  query: string,
): Promise<SupportProductCard[]> => {
  try {
    const response = await fetch(
      `http://localhost:${env.PORT}/v1/public/products?page=1&limit=12&sortBy=createdAt&sortOrder=desc`,
    );

    if (!response.ok) return [];

    const result = await response.json();
    const products = Array.isArray(result?.data) ? result.data : [];
    const normalizedQuery = query.toLowerCase();
    const categoryHints = [
      "men",
      "women",
      "beauty",
      "accessories",
      "shoes",
      "bags",
    ];
    const matchedHint = categoryHints.find((hint) =>
      normalizedQuery.includes(hint),
    );

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
      price: Number.isFinite(Number(product?.price))
        ? Number(product.price)
        : null,
      imageUrl: resolveProductImageUrl(
        product?.imageUrls?.find?.(Boolean) ||
          product?.imageUrl ||
          product?.variants?.[0]?.images?.[0]?.imageUrl ||
          product?.variants?.[0]?.images?.[0],
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
      "We couldn't load products just now — please try again in a moment.",
      PRODUCT_SUGGESTIONS,
    );
  }

  const normalizedQuery = query.toLowerCase();
  const intro = /dropshipping|drop shipping/.test(normalizedQuery)
    ? "Here are some dropshipping picks you can explore right away:"
    : "Here are a few products you might like — tap any item to view details:";

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
    "Of course — I've passed this to our support team. A specialist will reply here shortly. If you have an order code or can describe the issue in a bit more detail, that will help us assist you faster.",
  );
};

const buildEscalatedWaitingReply = (
  customerMessage: string,
  recentMessages: SupportMessage[],
) => {
  const cleanedMessage = stripThreadMarker(customerMessage)
    .toLowerCase()
    .trim();
  const intentSuggestions = getIntentSuggestions(cleanedMessage);
  const filteredSuggestions = intentSuggestions.filter(
    (suggestion) =>
      normalizeReply(suggestion) !== normalizeReply(cleanedMessage),
  );
  const nextSuggestions = filteredSuggestions.length
    ? filteredSuggestions
    : intentSuggestions;

  let baseReply =
    "Your message has been shared with our support team — someone will reply here shortly.";

  if (
    /\blogin\b|sign in|signin|log in|can't login|cannot login|otp|password|profile|account/.test(
      cleanedMessage,
    )
  ) {
    baseReply =
      "We've shared your account question with our team. While you wait, please keep the exact error message handy so we can resolve this quickly for you.";
  } else if (
    /payment|campay|stripe|card|checkout|failed|declin/.test(cleanedMessage)
  ) {
    baseReply =
      "We've passed your payment issue to our team. If you can share the payment method used and the exact error text, that will help us get this sorted faster.";
  } else if (
    /order|track|status|delivery|shipping|shipment/.test(cleanedMessage)
  ) {
    baseReply =
      "We've shared your order enquiry with our team. Sending your order code (ORD-...) now will help us look it up right away.";
  } else if (
    /product|products|catalog|item|items|trending|dropshipping|drop shipping/.test(
      cleanedMessage,
    )
  ) {
    baseReply =
      "We've shared your product request with our team. Feel free to mention your preferred category so we can recommend the best options.";
  } else if (CONVERSATIONAL_SHORTCUT_PATTERN.test(cleanedMessage)) {
    baseReply =
      "Thank you — your conversation is still with our support team, and someone will reply here shortly.";
  }

  const fullReply = withSuggestionsMarker(baseReply, nextSuggestions);
  const lastSupportText = stripThreadMarker(
    [...recentMessages].reverse().find((item) => item.sender === "support")
      ?.text || "",
  );

  if (
    normalizeReply(stripThreadMarker(fullReply)) ===
    normalizeReply(lastSupportText)
  ) {
    return withSuggestionsMarker(
      "Got it — we've added that to your support ticket. Our team will reply here soon.",
      nextSuggestions,
    );
  }

  return fullReply;
};

const getSupportOrderTrackingReply = async (message: string) => {
  const reference = getTrackingReferenceFromMessage(message);

  if (!reference) {
    return withSuggestionsMarker(
      "We'd be happy to look that up for you. Share your order code (for example, ORD-20260705-1234) or your tracking reference.",
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
        "We couldn't find an order with that reference. Please double-check and resend your order code (ORD-...) or tracking reference.",
        ORDER_SUGGESTIONS,
      );
    }

    const paymentStatus =
      order.paymentTransactions?.[0]?.paymentStatus?.name || "pending";
    const steps = buildCustomerOrderTrackingSteps({
      statusId: order.statusId,
      fulfillmentMethod: order.fulfillmentMethod ?? FulfillmentMethod.DELIVERY,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
    const currentStep =
      steps.find((step) => step.active) ||
      steps.filter((step) => step.completed).slice(-1)[0];
    const lastUpdated = formatTrackingDate(order.updatedAt || order.createdAt);
    const eta = resolveEta(order, currentStep?.label || "");
    const location = resolveTrackingLocation(order);

    return `Here's the latest on ${order.orderCode}: status is ${order.orderStatus?.name || "pending"}. Current stage: ${currentStep?.label || "Order Placed"}. Payment: ${paymentStatus}. Last update: ${lastUpdated}. ETA: ${eta}.${location ? ` Location: ${location}.` : ""}`;
  } catch {
    return "We couldn't retrieve tracking details just now — please try again in a moment.";
  }
};

const buildRuleBasedReply = (message: string) => {
  if (parseSupportAttachment(message)) {
    return buildAttachmentReply();
  }

  const normalized = message.toLowerCase();
  const normalizedChip = normalizeReply(stripThreadMarker(message));

  if (KNOWN_SUPPORT_CHIPS_NORMALIZED.has(normalizedChip)) {
    if (/track|order|delivery|shipping|where/.test(normalizedChip)) {
      return withSuggestionsMarker(
        "Happy to help with your order. Share your order code (ORD-...) or choose one of the options below.",
        ORDER_SUGGESTIONS,
      );
    }

    if (
      /payment|campay|stripe|card|checkout|failed|declin/.test(normalizedChip)
    ) {
      return withSuggestionsMarker(
        "No worries — we can help with payment issues. Tell us which method you used and what error appeared on screen.",
        PAYMENT_SUGGESTIONS,
      );
    }

    if (
      /login|sign in|signin|otp|password|profile|account/.test(normalizedChip)
    ) {
      return withSuggestionsMarker(
        "We can help with account access. Let us know whether this is about login, OTP, password reset, or your profile.",
        ACCOUNT_SUGGESTIONS,
      );
    }

    if (
      /product|products|catalog|show me|item|items|trending|dropshipping|drop shipping/.test(
        normalizedChip,
      )
    ) {
      return withSuggestionsMarker(
        "Sure thing — tell us what you'd like to browse, or pick one of these product options.",
        PRODUCT_SUGGESTIONS,
      );
    }

    if (/agent|support|human|representative/.test(normalizedChip)) {
      return buildAgentHandoffReply();
    }
  }

  if (
    /^thanks?$|^thank you$|^thx$|^ty$|thank\b|thank you so much|thanks a lot|gotcha|got it|ok got it|cool thanks|nice thanks/.test(
      normalized,
    )
  ) {
    return "You're very welcome! If there's anything else we can help with — orders, payments, or finding products — just let us know.";
  }

  if (
    /^cool$|^ok$|^okay$|^nice$|^great$|^awesome$|^perfect$/.test(normalized)
  ) {
    return withSuggestionsMarker(
      "Glad we could help. Is there anything else you'd like assistance with?",
      GENERAL_SUGGESTIONS,
    );
  }

  if (/\b(shit|damn|wtf|fuck|f\*\*\*)\b/.test(normalized)) {
    return withSuggestionsMarker(
      "We completely understand — let's get this sorted for you. Share the exact error you're seeing, or choose one of the options below.",
      getIntentSuggestions(normalized),
    );
  }

  if (
    /^bye$|^goodbye$|see you|cya|talk later|good night|gn$/.test(normalized)
  ) {
    return "Take care! We'll be here whenever you need us. Have a great day.";
  }

  if (/^hi$|^hello$|^hey$|^yo$/.test(normalized)) {
    return withSuggestionsMarker(
      "Hello! Lovely to hear from you. What can we help you with today?",
      GENERAL_SUGGESTIONS,
    );
  }

  if (
    /\blogin\b|sign in|signin|log in|can't login|cannot login/.test(normalized)
  ) {
    return withSuggestionsMarker(
      "Let's get you signed in. Confirm you're using the same phone number or email from registration, including the correct country code. If you've forgotten your password, use Forgot Password to reset it. Still stuck? Send us the exact error and whether you're on mobile or desktop.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (
    /^otp$|code not received|verification code|one time password/.test(
      normalized,
    )
  ) {
    return withSuggestionsMarker(
      "For OTP issues: check your phone number includes the country code, wait 30–60 seconds and try resending once, and make sure your network connection is stable. If the code still doesn't arrive, share the last few digits of your number and when you requested it so we can trace delivery.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/password reset|forgot password|reset password/.test(normalized)) {
    return withSuggestionsMarker(
      "To reset your password: open Forgot Password, request an OTP, then set a new password with at least 8 characters. If anything fails along the way, tell us the exact error and which step it happened at.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/profile|account settings|update profile|photo upload/.test(normalized)) {
    return withSuggestionsMarker(
      "For profile updates, let us know which field isn't saving correctly (name, phone, photo, or email) and whether you see an error when you tap Save — we'll walk you through the fix.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/payment|campay|stripe|card|checkout|failed|declin/.test(normalized)) {
    return withSuggestionsMarker(
      "Payment issues happen — we're here to help. Share which method you used (Campay or card), the exact error message, and roughly when it occurred so we can guide you through the next steps.",
      PAYMENT_SUGGESTIONS,
    );
  }

  if (/group|dropshipping|drop shipping|ongoing/.test(normalized)) {
    return withSuggestionsMarker(
      "For group and dropshipping enquiries, share the product or group you're interested in and what you'd like to do — we'll point you in the right direction.",
      PRODUCT_SUGGESTIONS,
    );
  }

  if (/order|track|status|delivery|shipping|where/.test(normalized)) {
    return withSuggestionsMarker(
      "We'd be happy to check on your order. Send your order code (ORD-...) and we'll fetch the latest tracking status for you.",
      ORDER_SUGGESTIONS,
    );
  }

  if (/account|login|otp|password|profile/.test(normalized)) {
    return withSuggestionsMarker(
      "We can help with your account. Let us know if this is about login, OTP, password reset, or updating your profile, and we'll give you the exact steps.",
      ACCOUNT_SUGGESTIONS,
    );
  }

  if (/product|products|catalog|show me|item|items/.test(normalized)) {
    return withSuggestionsMarker(
      "Happy to help you browse. Tell us whether you're looking for direct-order or dropshipping items, and optionally a category like men, women, beauty, or accessories.",
      PRODUCT_SUGGESTIONS,
    );
  }

  return withSuggestionsMarker(
    "We want to make sure we help you properly. Could you share a few more details, or choose one of the quick options below?",
    getIntentSuggestions(normalized),
  );
};

const buildChatHistory = (recentMessages: SupportMessage[]) =>
  recentMessages
    .slice(-10)
    .map((item) => `${item.sender}: ${stripThreadMarker(item.text)}`)
    .join("\n");

const buildSupportPrompt = (
  cleanedMessage: string,
  recentMessages: SupportMessage[],
) => ({
  system:
    "You are a friendly, professional Edoshop support assistant. Write warm, clear replies in complete sentences — avoid sounding robotic or overly terse. Keep answers concise but helpful. Focus on orders, payments, accounts, and products. Ask one focused follow-up question when details are missing. If the customer says thank you, respond with a brief polite closing rather than restarting with generic options.",
  user: `Recent chat:\n${buildChatHistory(recentMessages)}\n\nCurrent customer message:\n${cleanedMessage}`,
});

const callOpenAi = async (
  cleanedMessage: string,
  recentMessages: SupportMessage[],
) => {
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

const callOllama = async (
  cleanedMessage: string,
  recentMessages: SupportMessage[],
) => {
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
    return "Could you share a bit more detail so we can help you properly?";
  }

  if (parseSupportAttachment(customerMessage)) {
    return buildAttachmentReply();
  }

  if (KNOWN_SUPPORT_CHIPS_NORMALIZED.has(normalizeReply(cleanedMessage))) {
    if (PRODUCT_DISCOVERY_PATTERN.test(cleanedMessage)) {
      return buildProductCardsReply(cleanedMessage);
    }
    return buildRuleBasedReply(cleanedMessage);
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
  if (
    /^thanks?$|^thank you$|^thx$|^ty$|thank\b|thank you so much|thanks a lot|gotcha|got it|ok got it|cool thanks|nice thanks|cool|ok|okay|nice|great|awesome|perfect/i.test(
      cleanedMessage,
    )
  ) {
    return "You are welcome. If you need anything else, I am here to help.";
  }

  if (
    /^bye$|^goodbye$|see you|cya|talk later|good night|gn$/i.test(
      cleanedMessage,
    )
  ) {
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
      [...recentMessages].reverse().find((item) => item.sender === "support")
        ?.text || "",
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
      [...recentMessages].reverse().find((item) => item.sender === "support")
        ?.text || "",
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

const createMessage = (
  sender: "customer" | "support",
  text: string,
  metadata: SupportMessageMetadata = {},
): SupportMessage => {
  const message: SupportMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sender,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  if (metadata.customerFirstName?.trim()) {
    message.customerFirstName = metadata.customerFirstName.trim();
  }
  if (metadata.customerId?.trim()) {
    message.customerId = metadata.customerId.trim();
  }
  if (metadata.visitorId?.trim()) {
    message.visitorId = metadata.visitorId.trim();
  }
  if (metadata.threadId?.trim()) {
    message.threadId = metadata.threadId.trim();
  }

  return message;
};

// Temporary live support thread for local testing until chat persistence is finalized.
const escalatedThreads = new Set<string>();
const escalatedThreadLastAckAt = new Map<string, number>();
const escalatedThreadLastCustomerText = new Map<string, string>();

const messages: SupportMessage[] = [
  {
    id: "welcome",
    sender: "support",
    text: withBotMarker(
      withSuggestionsMarker(
        "Hello and welcome to Edoshop! We're here to help with orders, payments, account questions, and product discovery. Choose a topic below, or tell us what's on your mind.",
        GENERAL_SUGGESTIONS,
      ),
    ),
    createdAt: new Date().toISOString(),
  },
];

void (async () => {
  try {
    const cards = await getSupportProductCards("");
    if (!cards.length) return;

    messages[0].text = withBotMarker(
      withSuggestionsMarker(
        withProductCardsMarker(
          "Hello and welcome to Edoshop! Here are a few products you might like — or choose a topic below to get started.",
          cards,
        ),
        GENERAL_SUGGESTIONS,
      ),
    );
  } catch {
    // Keep text-only welcome if product cards fail to load.
  }
})();

const listMessagesRoute = createRoute({
  method: "get",
  path: "/support-chat/messages",
  tags: ["Support Chat"],
  request: {
    query: z.object({
      threadId: z.string().min(16).max(200),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(supportMessageSchema)),
      "Support chat messages",
    ),
  },
});

const listAdminMessagesRoute = createRoute({
  method: "get",
  path: "/support-chat/admin/messages",
  tags: ["Support Chat"],
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.CHAT, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(supportMessageSchema)),
      "Admin support chat messages",
    ),
  },
});

const listThreadsRoute = createRoute({
  method: "get",
  path: "/support-chat/threads",
  tags: ["Support Chat"],
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.CHAT, operation: OperationType.READ },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
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
    body: jsonContentRequired(
      createCustomerSupportMessageSchema,
      "Customer support chat message",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(supportMessageSchema),
      "Support chat message created",
    ),
  },
});

const createAdminMessageRoute = createRoute({
  method: "post",
  path: "/support-chat/admin/messages",
  tags: ["Support Chat"],
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.CHAT, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      createAdminSupportMessageSchema,
      "Admin support chat message",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(supportMessageSchema),
      "Support chat message created",
    ),
  },
});

router.openapi(listMessagesRoute, (async (c) => {
  const { threadId } = c.req.valid("query");
  const threadMessages = messages.filter(
    (message) =>
      message.id === "welcome" || getThreadIdFromText(message.text) === threadId,
  );
  return c.json(
    successResponse(threadMessages, "Support chat messages retrieved"),
  );
}) as any);

router.openapi(listAdminMessagesRoute, (async (c) => {
  return c.json(
    successResponse(messages, "Admin support chat messages retrieved"),
  );
}) as any);

router.openapi(listThreadsRoute, (async (c) => {
  return c.json(
    successResponse(
      await buildSupportThreads(messages),
      "Support chat threads retrieved",
    ),
  );
}) as any);

router.openapi(createAdminMessageRoute, (async (c) => {
  const data = c.req.valid("json");
  const message = createMessage("support", data.text);
  const threadId = getThreadIdFromText(message.text);

  messages.push(message);

  if (threadId && !isBotMessage(message.text)) {
    escalatedThreads.delete(threadId);
    escalatedThreadLastAckAt.delete(threadId);
    escalatedThreadLastCustomerText.delete(threadId);
  }

  return c.json(successResponse(message, "Support chat message created"));
}) as any);

router.openapi(createMessageRoute, (async (c) => {
  const data = c.req.valid("json");
  const message = createMessage("customer", data.text, {
    customerFirstName: data.customerFirstName,
    customerId:
      data.customerId != null ? String(data.customerId) : undefined,
    visitorId: data.visitorId,
    threadId: data.threadId,
  });
  const threadId = getThreadIdFromText(message.text);

  messages.push(message);

  if (threadId && escalatedThreads.has(threadId)) {
    escalatedThreadLastCustomerText.set(
      threadId,
      normalizeReply(stripThreadMarker(message.text)),
    );
    return c.json(successResponse(message, "Support chat message created"));
  }

  const relevantMessages = threadId
    ? messages.filter((item) => getThreadIdFromText(item.text) === threadId)
    : messages;

  const replyText = await createAiReply(message.text, relevantMessages);

  if (
    threadId &&
    (parseSupportAttachment(message.text) ||
      replyText.includes(AGENT_HANDOFF_REQUEST_MARKER))
  ) {
    escalatedThreads.add(threadId);
    escalatedThreadLastAckAt.set(threadId, Date.now());
    escalatedThreadLastCustomerText.set(
      threadId,
      normalizeReply(stripThreadMarker(message.text)),
    );
  }

  const supportReply = createMessage(
    "support",
    withThreadMarker(withBotMarker(replyText), threadId),
  );

  messages.push(supportReply);

  return c.json(successResponse(message, "Support chat message created"));
}) as any);

export default router;
