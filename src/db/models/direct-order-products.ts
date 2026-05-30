import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { products } from "./products";
import { users } from "./users";

export const directOrderProducts = pgTable("direct_order_products", {
  id: serial().primaryKey(),
  productId: integer().references(() => products.id),
  seriesId: integer(),
  directOrderCode: varchar({ length: 50 }).unique(),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const directOrderProductsSchema =
  createSelectSchema(directOrderProducts);

export type DirectOrderProducts = z.infer<typeof directOrderProductsSchema>;

/**
 * DirectOrderProducts insert schema
 */
export const insertDirectOrderProductsSchema =
  createInsertSchema(directOrderProducts);

/**
 * New directOrderProducts type definition
 */
export type NewDirectOrderProducts = z.infer<
  typeof insertDirectOrderProductsSchema
>;

export default directOrderProducts;

export const directOrderProductsRelations = relations(
  directOrderProducts,
  ({ one }) => ({
    product: one(products, {
      fields: [directOrderProducts.productId],
      references: [products.id],
    }),
    createdBy: one(users, {
      fields: [directOrderProducts.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [directOrderProducts.updatedBy],
      references: [users.id],
    }),
  }),
);
