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
import { orders } from "./orders";
import { users } from "./users";

export const orderFulfillmentStatuses = pgTable("order_fulfillment_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const orderFulfillmentStatusesSchema = createSelectSchema(orderFulfillmentStatuses);
export type OrderFulfillmentStatuses = z.infer<typeof orderFulfillmentStatusesSchema>;

export const insertOrderFulfillmentStatusesSchema = createInsertSchema(orderFulfillmentStatuses);
export type NewOrderFulfillmentStatuses = z.infer<typeof insertOrderFulfillmentStatusesSchema>;
export default orderFulfillmentStatuses;

export const orderFulfillmentStatusesRelations = relations(orderFulfillmentStatuses, ({ one, many }) => ({
  orders: many(orders),
  createdByUser: one(users, { fields: [orderFulfillmentStatuses.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [orderFulfillmentStatuses.updatedBy], references: [users.id] }),
}));
