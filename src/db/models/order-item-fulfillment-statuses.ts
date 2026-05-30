import type { z } from "zod";

import { relations } from "drizzle-orm";
import {

  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { orderItems } from "./order-items";
import { users } from "./users";

export const orderItemFulfillmentStatuses = pgTable("order_item_fulfillment_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const orderItemFulfillmentStatusesSchema = createSelectSchema(orderItemFulfillmentStatuses);
export type OrderItemFulfillmentStatuses = z.infer<typeof orderItemFulfillmentStatusesSchema>;

export const insertOrderItemFulfillmentStatusesSchema = createInsertSchema(orderItemFulfillmentStatuses);
export type NewOrderItemFulfillmentStatuses = z.infer<typeof insertOrderItemFulfillmentStatusesSchema>;
export default orderItemFulfillmentStatuses;

export const orderItemFulfillmentStatusesRelations = relations(orderItemFulfillmentStatuses, ({ one, many }) => ({
  orderItems: many(orderItems),
  createdByUser: one(users, { fields: [orderItemFulfillmentStatuses.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [orderItemFulfillmentStatuses.updatedBy], references: [users.id] }),
}));
