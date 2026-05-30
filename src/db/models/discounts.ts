import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { discountTypes } from "./discount-types";
import { series } from "./series";
import { users } from "./users";

export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  name: varchar("name"),
  description: varchar("description"),
  discountTypeId: integer("discount_type_id").references(
    () => discountTypes.id,
  ),
  discountValue: decimal("discount_value"),
  minimumPurchaseAmount: decimal("minimum_purchase_amount"),
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  seriesId: integer("series_id").references(() => series.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const discountsSchema = createSelectSchema(discounts);
export type Discount = z.infer<typeof discountsSchema>;
export const insertDiscountSchema = createInsertSchema(discounts);
export type NewDiscount = z.infer<typeof insertDiscountSchema>;

export const discountsRelations = relations(discounts, ({ one }) => ({
  discountType: one(discountTypes, {
    fields: [discounts.discountTypeId],
    references: [discountTypes.id],
  }),
  series: one(series, {
    fields: [discounts.seriesId],
    references: [series.id],
  }),
  createdByUser: one(users, {
    fields: [discounts.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [discounts.updatedBy],
    references: [users.id],
  }),
}));

export default discounts;
