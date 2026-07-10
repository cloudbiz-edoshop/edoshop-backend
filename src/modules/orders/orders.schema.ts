import { z } from "zod";
import { orderItemsSchema } from "@/db/models/order-items";
import { FulfillmentMethod } from "@/constants/fulfillment.constants";
import { commonStringSchema } from "@/lib/zod-schemas";

export const ordersToFulfillSchema = z.array(
  z.object({
    orderId: z.number(),
    orderCode: z.string(),
    customerId: z.number(),
    customerCode: z.string(),
    customerName: z.string().optional(),
    shippingPriority: z.string(),
    orderType: z.string().optional(),
    totalAmount: z.string().optional(),
    amount: z.string().optional(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.string().optional(),
    createdAt: z.string(),
  }),
);

export const checkoutCartItemSchema = z.object({
  productId: z.number().min(1),
  variantId: z.number().min(1).optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  color: z.string().optional(),
  size: z.string().optional(),
});

const checkoutBillingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  whatsappNumber: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  streetAddress: z.string().optional(),
  apartmentAddress: z.string().optional(),
  orderNotes: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional(),
  longitude: z.union([z.number(), z.string()]).optional(),
});

const checkoutFulfillmentFieldsSchema = z.object({
  fulfillmentMethod: z
    .enum([FulfillmentMethod.PICKUP, FulfillmentMethod.DELIVERY])
    .default(FulfillmentMethod.DELIVERY),
  pickupWarehouseId: z.number().min(1).optional(),
  billing: checkoutBillingSchema,
  items: z.array(checkoutCartItemSchema).min(1),
});

type CheckoutFulfillmentInput = z.infer<typeof checkoutFulfillmentFieldsSchema>;

const parseCheckoutCoordinate = (value?: string | number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCheckoutCoordinates = (billing: CheckoutFulfillmentInput["billing"]) => {
  const latitude = parseCheckoutCoordinate(billing.latitude);
  const longitude = parseCheckoutCoordinate(billing.longitude);
  return latitude !== null && longitude !== null && (latitude !== 0 || longitude !== 0);
};

const applyCheckoutFulfillmentRefine = (
  data: CheckoutFulfillmentInput,
  ctx: z.RefinementCtx,
) => {
  if (data.fulfillmentMethod === FulfillmentMethod.DELIVERY) {
    if (!data.billing.streetAddress?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Street address is required for delivery",
        path: ["billing", "streetAddress"],
      });
    }
  }

  if (data.fulfillmentMethod === FulfillmentMethod.PICKUP) {
    if (!data.pickupWarehouseId && !hasCheckoutCoordinates(data.billing)) {
      ctx.addIssue({
        code: "custom",
        message: "Select a pickup location on the map",
        path: ["billing", "latitude"],
      });
    }
  }
};

export const checkoutDirectOrderRequestSchema = checkoutFulfillmentFieldsSchema
  .extend({
    paymentMethodId: z.number().min(1).optional(),
    payOnDelivery: z.boolean().optional().default(false),
  })
  .superRefine(applyCheckoutFulfillmentRefine);

export const checkoutStripeOrderRequestSchema = checkoutFulfillmentFieldsSchema
  .extend({
    currency: z.enum(["xaf", "usd", "eur"]).optional().default("xaf"),
    paymentGateway: z.enum(["stripe", "paypal"]).optional().default("stripe"),
  })
  .superRefine(applyCheckoutFulfillmentRefine);

export type CheckoutDirectOrderRequest = z.infer<
  typeof checkoutDirectOrderRequestSchema
>;

export const checkoutDirectOrderResponseSchema = z.object({
  orderId: z.number(),
  orderCode: z.string(),
  totalAmount: z.string(),
  subtotal: z.string().optional(),
  shippingAmount: z.string().optional(),
  fulfillmentMethod: z.string().optional(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  paymentTransactionId: z.number().optional(),
  transactionReference: z.string().optional(),
  campayReference: z.string().optional(),
  campayStatus: z.string().optional(),
  campayOperator: z.string().nullable().optional(),
  campayUssdCode: z.string().nullable().optional(),
});

export const customerOrderSummarySchema = z.object({
  id: z.number(),
  orderCode: z.string(),
  orderType: z.string().optional(),
  fulfillmentMethod: z.string(),
  status: z.string(),
  paymentStatus: z.string().optional(),
  totalAmount: z.string(),
  shippingAmount: z.string(),
  createdAt: z.string(),
  itemCount: z.number(),
  previewImages: z.array(z.string()).optional(),
  bundleCode: z.string().nullable().optional(),
  currentStepLabel: z.string().nullable().optional(),
});

export const customerOrderTrackingStepSchema = z.object({
  id: z.number(),
  label: z.string(),
  details: z.string(),
  date: z.string().nullable(),
  completed: z.boolean(),
  active: z.boolean(),
});

const customerOrderTrackingHistorySchema = z.object({
  id: z.number(),
  stepLabel: z.string(),
  notes: z.string().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedByName: z.string().nullable().optional(),
});

export const customerOrderTrackingSchema = z.object({
  orderCode: z.string(),
  fulfillmentMethod: z.string(),
  status: z.string(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  placedAt: z.string(),
  totalAmount: z.string(),
  subtotal: z.string(),
  shippingAmount: z.string(),
  pickupLocation: z.string().nullable().optional(),
  billingAddress: z.string().nullable().optional(),
  shippingAddress: z.string().nullable().optional(),
  items: z.array(
    z.object({
      id: z.number(),
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.string(),
      subTotal: z.string(),
      productImageUrl: z.string().nullable().optional(),
      sizeName: z.string().optional(),
      colorName: z.string().optional(),
    }),
  ),
  steps: z.array(customerOrderTrackingStepSchema),
  manufacturerToStoreSteps: z.array(customerOrderTrackingStepSchema).optional(),
  storeToCustomerSteps: z.array(customerOrderTrackingStepSchema).optional(),
  orderType: z.string().optional(),
  bundleCode: z.string().nullable().optional(),
  trackingGroups: z
    .array(
      z.object({
        sourceBundleId: z.number(),
        trackingBundleId: z.number().nullable().optional(),
        bundleCode: z.string(),
        currentStepLabel: z.string().nullable().optional(),
        orderItemIds: z.array(z.number()),
        trackingHistory: z.array(customerOrderTrackingHistorySchema).optional(),
        steps: z.array(customerOrderTrackingStepSchema),
        manufacturerToStoreSteps: z.array(customerOrderTrackingStepSchema).optional(),
        storeToCustomerSteps: z.array(customerOrderTrackingStepSchema).optional(),
      }),
    )
    .optional(),
  trackingHistory: z.array(customerOrderTrackingHistorySchema).optional(),
});

export type CheckoutDirectOrderResponse = z.infer<
  typeof checkoutDirectOrderResponseSchema
>;

export type OrdersToFulfill = z.infer<typeof ordersToFulfillSchema>;

export const orderDetailsForACustomerToFulfillItemSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productCode: z.string(),
  variantId: z.number(),
  variantCode: z.string(),
  orderId: z.number(),
  orderCode: z.string(),
  image: z.string().nullable(),
  price: z.string(), // Decimal is usually string in JSON
  variantSize: z.string(),
  variantColor: z.string(),
  fulfillmentTime: z.string().nullable(),
  deliveryAddress: z.string(),
  quantityAsked: z.number(),
  quantityPacked: z.number(),
  quantityAvailable: z.number(),
  note: z.string().optional(),
  createdAt: z.string(),
});

export const orderDetailsForACustomerToFulfillSchema = z.array(
  orderDetailsForACustomerToFulfillItemSchema,
);

export type OrderDetailsForCustomerToFulfill = z.infer<typeof orderDetailsForACustomerToFulfillSchema>;

export const updateAvailableQuantityForFulfillmentRequestSchema = z.object({
  orderId: z.number().min(1).describe("The ID of the order"),
  productId: z.number().min(1).describe("The ID of the product"),
  variantId: z.number().min(1).describe("The ID of the variant to update"),
  quantityAvailable: z
    .number()
    .describe("The new available quantity for the variant"),
  notes: commonStringSchema
    .optional()
    .describe(
      "Notes required if the available quantity is less than the quantity asked",
    ),
});

export type UpdateAvailableQuantityForFulfillmentRequest = z.infer<
  typeof updateAvailableQuantityForFulfillmentRequestSchema
>;

export const updateAvailableQuantityForFulfillmentResponseSchema = orderItemsSchema;

export type UpdateAvailableQuantityResponse = z.infer<
  typeof updateAvailableQuantityForFulfillmentResponseSchema
>;
