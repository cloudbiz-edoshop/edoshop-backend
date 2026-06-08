import { z } from "@hono/zod-openapi";

import { newArrivalsSchema } from "@/db/models/new-arrivals";
import { productsSchema } from "@/db/models/products";

// Create new arrival request schema
export const createNewArrivalRequestSchema = z.object({
  startDate: z.string().describe("Start date for new arrivals period"),
  endDate: z.string().describe("End date for new arrivals period"),
});

export type CreateNewArrivalRequest = z.infer<
  typeof createNewArrivalRequestSchema
>;

// Create new arrival response schema
export const createNewArrivalResponseSchema = newArrivalsSchema;

export type CreateNewArrivalResponse = z.infer<
  typeof createNewArrivalResponseSchema
>;

// Update new arrival request schema
export const updateNewArrivalRequestSchema =
  createNewArrivalRequestSchema.partial();

export type UpdateNewArrivalRequest = z.infer<
  typeof updateNewArrivalRequestSchema
>;

// Get new arrival response schema
export const getNewArrivalResponseSchema = newArrivalsSchema;

export type GetNewArrivalResponse = z.infer<typeof getNewArrivalResponseSchema>;

// List new arrivals response schema
export const listNewArrivalsResponseSchema = z.array(
  getNewArrivalResponseSchema,
);

export type ListNewArrivalsResponse = z.infer<
  typeof listNewArrivalsResponseSchema
>;

// Add product to new arrivals request schema
export const addProductToNewArrivalsRequestSchema = z.object({
  productIds: z
    .array(z.number())
    .describe("Array of product IDs to add to new arrivals"),
});

export type AddProductToNewArrivalsRequest = z.infer<
  typeof addProductToNewArrivalsRequestSchema
>;

// Remove product from new arrivals request schema
export const removeProductFromNewArrivalsRequestSchema = z.object({
  productIds: z
    .array(z.number())
    .describe("Array of product IDs to remove from new arrivals"),
});

export type RemoveProductFromNewArrivalsRequest = z.infer<
  typeof removeProductFromNewArrivalsRequestSchema
>;

// Product with new arrivals info schema
export const productWithNewArrivalsSchema = productsSchema.extend({
  newArrivalId: z
    .number()
    .optional()
    .describe("New arrival period ID linked to the product"),
  isNewArrival: z
    .boolean()
    .describe("Whether the product is marked as new arrival"),
  newArrivalStartDate: z
    .string()
    .optional()
    .describe("Start date of new arrival period"),
  newArrivalEndDate: z
    .string()
    .optional()
    .describe("End date of new arrival period"),
});

export type ProductWithNewArrivals = z.infer<
  typeof productWithNewArrivalsSchema
>;

// List products as new arrivals response schema
export const listProductsAsNewArrivalsResponseSchema = z.array(
  productWithNewArrivalsSchema,
);

export type ListProductsAsNewArrivalsResponse = z.infer<
  typeof listProductsAsNewArrivalsResponseSchema
>;
