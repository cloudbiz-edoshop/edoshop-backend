import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { colors } from "./colors";
import { designPatterns } from "./design-patterns";
import { items } from "./items";
import { materialTypes } from "./material-types";
import { orderItems } from "./order-items";
import { products } from "./products";
import { sizes } from "./sizes";
import { users } from "./users";
import { variantImages } from "./variant-images";

export const variants = pgTable("variants", {
  id: serial().primaryKey(),
  productId: integer()
    .references(() => products.id)
    .notNull(),
  variantCode: varchar({ length: 100 }).notNull().unique(),
  itemId: integer().references(() => items.id),
  colorId: integer()
    .references(() => colors.id)
    .notNull(),
  sizeId: integer()
    .references(() => sizes.id)
    .notNull(),
  materialTypeId: integer()
    .references(() => materialTypes.id)
    .notNull(),
  designPatternId: integer()
    .references(() => designPatterns.id)
    .notNull(),
  quantity: integer().notNull().default(0),
  additionalInfo: json(),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  isDeleted: boolean().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const variantsSchema = createSelectSchema(variants);

export type Variants = z.infer<typeof variantsSchema>;

/**
 * Variants insert schema
 */
export const insertVariantsSchema = createInsertSchema(variants);

/**
 * New variants type definition
 */
export type NewVariants = z.infer<typeof insertVariantsSchema>;

export default variants;

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
  item: one(items, {
    fields: [variants.itemId],
    references: [items.id],
  }),
  color: one(colors, {
    fields: [variants.colorId],
    references: [colors.id],
  }),
  size: one(sizes, {
    fields: [variants.sizeId],
    references: [sizes.id],
  }),
  materialType: one(materialTypes, {
    fields: [variants.materialTypeId],
    references: [materialTypes.id],
  }),
  designPattern: one(designPatterns, {
    fields: [variants.designPatternId],
    references: [designPatterns.id],
  }),
  createdBy: one(users, {
    fields: [variants.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [variants.updatedBy],
    references: [users.id],
  }),
  images: many(variantImages),
  orderItems: many(orderItems),
}));
