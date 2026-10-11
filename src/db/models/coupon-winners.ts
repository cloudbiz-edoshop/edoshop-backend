import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { coupons } from "./coupons";
import { orders } from "./orders";
import users from "./users";

export const couponWinners = pgTable(
  "coupon_winners",
  {
    id: serial("id").primaryKey(),
    couponId: integer("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
    redeemedAt: timestamp("redeemed_at"),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    couponUserUnique: uniqueIndex("coupon_winners_coupon_user_unique").on(
      table.couponId,
      table.userId,
    ),
  }),
);

export const couponWinnersRelations = relations(couponWinners, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponWinners.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponWinners.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [couponWinners.orderId],
    references: [orders.id],
  }),
}));

export default couponWinners;
