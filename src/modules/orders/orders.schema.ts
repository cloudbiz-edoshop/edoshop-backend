import { z } from "zod";
import { orderItemsSchema } from "@/db/models/order-items";
import { commonStringSchema } from "@/lib/zod-schemas";

export const ordersToFulfillSchema = z.array(
  z.object({
    orderId: z.number(),
    customerId: z.number(),
    customerCode: z.string(),
    shippingPriority: z.string(),
    createdAt: z.string(),
  }),
);

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
