import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { coupons } from "./coupons";
import { orders } from "./orders";
import users from "./users";

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  },
  (table) => ({
    couponUserUnique: uniqueIndex("coupon_redemptions_coupon_user_unique").on(
      table.couponId,
      table.userId,
    ),
  }),
);

export const couponRedemptionsRelations = relations(
  couponRedemptions,
  ({ one }) => ({
    coupon: one(coupons, {
      fields: [couponRedemptions.couponId],
      references: [coupons.id],
    }),
    user: one(users, {
      fields: [couponRedemptions.userId],
      references: [users.id],
    }),
    order: one(orders, {
      fields: [couponRedemptions.orderId],
      references: [orders.id],
    }),
  }),
);

export default couponRedemptions;
