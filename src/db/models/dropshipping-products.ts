import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { groupCriteriaTypes } from "./group-criteria-types";
import { products } from "./products";
import { users } from "./users";

export const dropshippingProducts = pgTable("dropshipping_products", {
  id: serial().primaryKey(),
  productId: integer().references(() => products.id),
  dropshippingCode: varchar({ length: 255 }).unique(),
  totalItems: integer(),
  groupCriteriaId: integer().references(() => groupCriteriaTypes.id),
  completionCriteria: decimal({ precision: 10, scale: 2 }),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const dropshippingProductsSchema =
  createSelectSchema(dropshippingProducts);

export type DropshippingProducts = z.infer<typeof dropshippingProductsSchema>;

/**
 * DropshippingProducts insert schema
 */
export const insertDropshippingProductsSchema =
  createInsertSchema(dropshippingProducts);

/**
 * New dropshippingProducts type definition
 */
export type NewDropshippingProducts = z.infer<
  typeof insertDropshippingProductsSchema
>;

export default dropshippingProducts;

export const dropshippingProductsRelations = relations(
  dropshippingProducts,
  ({ one }) => ({
    product: one(products, {
      fields: [dropshippingProducts.productId],
      references: [products.id],
    }),
    groupCriteriaId: one(groupCriteriaTypes, {
      fields: [dropshippingProducts.groupCriteriaId],
      references: [groupCriteriaTypes.id],
    }),
    createdBy: one(users, {
      fields: [dropshippingProducts.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [dropshippingProducts.updatedBy],
      references: [users.id],
    }),
  }),
);
