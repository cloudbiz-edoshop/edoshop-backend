import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { products } from "./products";
import { users } from "./users";

export const tvCatalogSelections = pgTable("tv_catalog_selections", {
  id: serial().primaryKey(),
  productId: integer("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedBy: integer("updated_by")
    .references(() => users.id)
    .notNull(),
});

export const tvCatalogSelectionsSchema = createSelectSchema(tvCatalogSelections);
export type TvCatalogSelection = z.infer<typeof tvCatalogSelectionsSchema>;
export const insertTvCatalogSelectionsSchema = createInsertSchema(tvCatalogSelections);

export const tvCatalogSelectionsRelations = relations(tvCatalogSelections, ({ one }) => ({
  product: one(products, {
    fields: [tvCatalogSelections.productId],
    references: [products.id],
  }),
  createdBy: one(users, {
    fields: [tvCatalogSelections.createdBy],
    references: [users.id],
  }),
}));

export default tvCatalogSelections;
