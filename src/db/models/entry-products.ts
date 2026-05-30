import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { entries } from "./entries";
import { products } from "./products";
import { users } from "./users";

export const entryProducts = pgTable("entry_products", {
  id: serial().primaryKey(),
  entryId: integer().references(() => entries.id).notNull(),
  productId: integer().references(() => products.id).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const entryProductsRelations = relations(entryProducts, ({ one }) => ({
  entry: one(entries, {
    fields: [entryProducts.entryId],
    references: [entries.id],
  }),
  product: one(products, {
    fields: [entryProducts.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [entryProducts.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [entryProducts.updatedBy],
    references: [users.id],
  }),
}));

export const insertEntryProductsSchema = createInsertSchema(entryProducts);
export const selectEntryProductsSchema = createSelectSchema(entryProducts);

export type NewEntryProduct = z.infer<typeof insertEntryProductsSchema>;
export type EntryProduct = z.infer<typeof selectEntryProductsSchema>;

export default entryProducts;
