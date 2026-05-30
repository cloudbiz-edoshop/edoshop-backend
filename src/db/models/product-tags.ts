import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { products } from "./products";
import { tags } from "./tags";
import { users } from "./users";

export const productTags = pgTable("product_tags", {
  id: serial().primaryKey(),
  productId: integer().references(() => products.id),
  tagId: integer().references(() => tags.id),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const productTagsSchema = createSelectSchema(productTags);

export type ProductTags = z.infer<typeof productTagsSchema>;

/**
 * ProductTags insert schema
 */
export const insertProductTagsSchema = createInsertSchema(productTags);

/**
 * New productTags type definition
 */
export type NewProductTags = z.infer<typeof insertProductTagsSchema>;

export default productTags;

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
    relationName: "productToTags",
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
  createdBy: one(users, {
    fields: [productTags.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [productTags.updatedBy],
    references: [users.id],
  }),
}));
