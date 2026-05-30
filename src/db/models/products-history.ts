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

import { products } from "./products";
import { users } from "./users";

export const productsHistory = pgTable("products_history", {
  id: serial().primaryKey(),
  productId: integer()
    .references(() => products.id)
    .notNull(),
  version: integer().notNull(),
  storeId: integer(),
  typeId: integer(),
  name: varchar({ length: 255 }),
  price: decimal({ precision: 10, scale: 2 }),
  categoryId: integer(),
  shortDescription: varchar({ length: 500 }),
  fullDescription: varchar({ length: 255 }),
  specifications: varchar({ length: 255 }),
  validFrom: timestamp({ mode: "string" }).notNull().defaultNow(),
  validTo: timestamp({ mode: "string" }),
  operation: varchar({ length: 255 }).notNull(),
  changedBy: integer().references(() => users.id),
});

export const productsHistorySchema = createSelectSchema(productsHistory);

export type ProductsHistory = z.infer<typeof productsHistorySchema>;

/**
 * ProductsHistory insert schema
 */
export const insertProductsHistorySchema = createInsertSchema(productsHistory);

/**
 * New productsHistory type definition
 */
export type NewProductsHistory = z.infer<typeof insertProductsHistorySchema>;

export default productsHistory;

export const productsHistoryRelations = relations(
  productsHistory,
  ({ one }) => ({
    product: one(products, {
      fields: [productsHistory.productId],
      references: [products.id],
    }),
    changedBy: one(users, {
      fields: [productsHistory.changedBy],
      references: [users.id],
    }),
  }),
);
