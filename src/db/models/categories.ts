import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { productCategories } from "./product-categories";
import { users } from "./users";

export const categories = pgTable("categories", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }),
  parentId: integer(),
  level: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const categoriesSchema = createSelectSchema(categories);

export type Categories = z.infer<typeof categoriesSchema>;

/**
 * Categories insert schema
 */
export const insertCategoriesSchema = createInsertSchema(categories);

/**
 * New categories type definition
 */
export type NewCategories = z.infer<typeof insertCategoriesSchema>;

export default categories;

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  createdBy: one(users, {
    fields: [categories.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [categories.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [categories.deletedBy],
    references: [users.id],
  }),
  productCategories: many(productCategories),
  // self reference
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
}));
