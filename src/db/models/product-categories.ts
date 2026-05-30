import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { categories } from "./categories";
import { products } from "./products";
import { users } from "./users";

export const productCategories = pgTable("product_categories", {
  id: serial().primaryKey(),
  productId: integer()
    .references(() => products.id)
    .notNull(),
  categoryId: integer()
    .references(() => categories.id)
    .notNull(),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const productCategoriesSchema = createSelectSchema(productCategories);

export type ProductCategories = z.infer<typeof productCategoriesSchema>;

/**
 * ProductCategories insert schema
 */
export const insertProductCategoriesSchema =
  createInsertSchema(productCategories);

/**
 * New productCategories type definition
 */
export type NewProductCategories = z.infer<
  typeof insertProductCategoriesSchema
>;

export default productCategories;

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    product: one(products, {
      fields: [productCategories.productId],
      references: [products.id],
      relationName: "productToCategories",
    }),
    category: one(categories, {
      fields: [productCategories.categoryId],
      references: [categories.id],
    }),
    createdBy: one(users, {
      fields: [productCategories.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [productCategories.updatedBy],
      references: [users.id],
    }),
  }),
);
