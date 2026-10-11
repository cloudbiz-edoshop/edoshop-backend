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

import { couponWinners } from "./coupon-winners";
import { discounts } from "./discounts";
import { users } from "./users";

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  discountId: integer("discount_id")
    .notNull()
    .references(() => discounts.id),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const couponsSchema = createSelectSchema(coupons);
export type Coupon = z.infer<typeof couponsSchema>;
export const insertCouponSchema = createInsertSchema(coupons);
export type NewCoupon = z.infer<typeof insertCouponSchema>;

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  discount: one(discounts, {
    fields: [coupons.discountId],
    references: [discounts.id],
  }),
  winners: many(couponWinners),
  createdByUser: one(users, {
    fields: [coupons.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [coupons.updatedBy],
    references: [users.id],
  }),
}));

export default coupons;
