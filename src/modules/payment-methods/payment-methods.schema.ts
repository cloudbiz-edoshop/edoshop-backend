import { z } from "zod";

import { paymentMethodsSchema } from "@/db/models/payment-methods";
import { paymentTypesSchema } from "@/db/models/payment-types";
import { descriptionSchema, idSchema, nameSchema } from "@/lib/zod-schemas";

// Schema for creating a new payment method
export const createPaymentMethodRequestSchema = z.object({
  name: nameSchema.describe("Payment method name"),
  description: descriptionSchema.describe("Payment method description"),
  countryId: idSchema.describe("Country ID"),
  paymentTypesIds: z
    .array(idSchema)
    .min(1, "At least one payment type ID is required")
    .describe("Payment types IDs"),
});

// Create payment method request type
export type CreatePaymentMethodRequest = z.infer<
  typeof createPaymentMethodRequestSchema
>;

// Create payment method response schema
export const createPaymentMethodResponseSchema = paymentMethodsSchema
  .extend({
    paymentTypes: z.array(paymentTypesSchema.nullable()),
  })
  .describe("Created payment method information");

// Create payment method response type
export type CreatePaymentMethodResponse = z.infer<
  typeof createPaymentMethodResponseSchema
>;

// Get payment method response schema
export const getPaymentMethodResponseSchema = paymentMethodsSchema
  .extend({
    paymentTypes: z.array(paymentTypesSchema.nullable()),
  })
  .describe("Payment method information");

// Get payment method response type
export type GetPaymentMethodResponse = z.infer<
  typeof getPaymentMethodResponseSchema
>;

// List payment methods response schema
export const listPaymentMethodsResponseSchema = z.array(
  getPaymentMethodResponseSchema,
);

// List payment methods response type
export type ListPaymentMethodsResponse = z.infer<
  typeof listPaymentMethodsResponseSchema
>;

// Schema for updating a payment method
export const updatePaymentMethodSchema =
  createPaymentMethodRequestSchema.partial();

// Update payment method request type
export type UpdatePaymentMethodRequest = z.infer<
  typeof updatePaymentMethodSchema
>;

// Update payment method response schema
export const updatePaymentMethodResponseSchema = getPaymentMethodResponseSchema;

// Update payment method response type
export type UpdatePaymentMethodResponse = z.infer<
  typeof updatePaymentMethodResponseSchema
>;
