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

import { users } from "./users";

export const productStoreTypes = pgTable("product_store_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const productStoreTypesSchema = createSelectSchema(productStoreTypes);

export type ProductStoreTypes = z.infer<typeof productStoreTypesSchema>;

/**
 * ProductStoreTypes insert schema
 */
export const insertProductStoreTypesSchema =
  createInsertSchema(productStoreTypes);

/**
 * New productStoreTypes type definition
 */
export type NewProductStoreTypes = z.infer<
  typeof insertProductStoreTypesSchema
>;

export default productStoreTypes;

export const productStoreTypesRelations = relations(
  productStoreTypes,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [productStoreTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [productStoreTypes.updatedBy],
      references: [users.id],
    }),
  }),
);
