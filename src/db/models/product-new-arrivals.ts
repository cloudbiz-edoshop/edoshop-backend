import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { newArrivals } from "./new-arrivals";
import { products } from "./products";
import { users } from "./users";

export const productNewArrivals = pgTable("product_new_arrivals", {
  id: serial().primaryKey(),
  productId: integer()
    .notNull()
    .references(() => products.id),
  newArrivalId: integer()
    .notNull()
    .references(() => newArrivals.id),
  addedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  removedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const productNewArrivalsSchema = createSelectSchema(productNewArrivals);

export type ProductNewArrivals = z.infer<typeof productNewArrivalsSchema>;

/**
 * Product new arrivals insert schema
 */
export const insertProductNewArrivalsSchema =
  createInsertSchema(productNewArrivals);

/**
 * Product new arrivals type definition
 */
export type NewProductNewArrivals = z.infer<
  typeof insertProductNewArrivalsSchema
>;

export default productNewArrivals;

export const productNewArrivalsRelations = relations(
  productNewArrivals,
  ({ one }) => ({
    product: one(products, {
      fields: [productNewArrivals.productId],
      references: [products.id],
    }),
    newArrival: one(newArrivals, {
      fields: [productNewArrivals.newArrivalId],
      references: [newArrivals.id],
    }),
    createdBy: one(users, {
      fields: [productNewArrivals.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [productNewArrivals.updatedBy],
      references: [users.id],
    }),
  }),
);
