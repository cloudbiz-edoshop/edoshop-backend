import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { directOrderProducts } from "./direct-order-products";
import { dropshippingProducts } from "./dropshipping-products";
import { orderItems } from "./order-items";
import { productCategories } from "./product-categories";
import { productTags } from "./product-tags";
import { series } from "./series";
import { stores } from "./stores";
import { users } from "./users";
import { variants } from "./variants";

export const products = pgTable("products", {
  id: serial().primaryKey(),
  storeId: integer().references(() => stores.id),
  seriesId: integer().references(() => series.id),
  name: varchar({ length: 255 }).notNull(),
  price: decimal({ precision: 10, scale: 2 }).notNull(),
  shortDescription: varchar({ length: 500 }),
  fullDescription: text(),
  specifications: text(),
  version: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  isDeleted: boolean().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
  concurrentReqs: integer(),
});

export const productsSchema = createSelectSchema(products);

export type Products = z.infer<typeof productsSchema>;

/**
 * Products insert schema
 */
export const insertProductsSchema = createInsertSchema(products);

/**
 * New products type definition
 */
export type NewProducts = z.infer<typeof insertProductsSchema>;

export default products;

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  series: one(series, {
    fields: [products.seriesId],
    references: [series.id],
  }),
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [products.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [products.deletedBy],
    references: [users.id],
  }),
  variants: many(variants),
  productCategories: many(productCategories, {
    relationName: "productToCategories",
  }),
  productTags: many(productTags, { relationName: "productToTags" }),
  directOrderProduct: one(directOrderProducts, {
    fields: [products.id],
    references: [directOrderProducts.productId],
  }),
  dropshippingProduct: one(dropshippingProducts, {
    fields: [products.id],
    references: [dropshippingProducts.productId],
  }),
  orderItems: many(orderItems),
}));
