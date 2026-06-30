import { z } from "zod";
import { orderItemsSchema } from "@/db/models/order-items";
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

export const checkoutDirectOrderRequestSchema = z.object({
  paymentMethodId: z.number().min(1).optional(),
  payOnDelivery: z.boolean().optional().default(false),
  billing: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    whatsappNumber: z.string().min(1),
    country: z.string().min(1),
    city: z.string().min(1),
    streetAddress: z.string().min(1),
    apartmentAddress: z.string().optional(),
    orderNotes: z.string().optional(),
  }),
  items: z.array(checkoutCartItemSchema).min(1),
});

export type CheckoutDirectOrderRequest = z.infer<
  typeof checkoutDirectOrderRequestSchema
>;

export const checkoutDirectOrderResponseSchema = z.object({
  orderId: z.number(),
  orderCode: z.string(),
  totalAmount: z.string(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  paymentTransactionId: z.number().optional(),
  transactionReference: z.string().optional(),
  campayReference: z.string().optional(),
  campayStatus: z.string().optional(),
  campayOperator: z.string().nullable().optional(),
  campayUssdCode: z.string().nullable().optional(),
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
