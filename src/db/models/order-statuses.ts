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

export const orderStatuses = pgTable("order_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const orderStatusesSchema = createSelectSchema(orderStatuses);
export type OrderStatuses = z.infer<typeof orderStatusesSchema>;
export const insertOrderStatusesSchema = createInsertSchema(orderStatuses);
export type NewOrderStatuses = z.infer<typeof insertOrderStatusesSchema>;

export const orderStatusesRelations = relations(orderStatuses, ({ one, many }) => ({
  orders: many(orders),
  createdBy: one(users, { fields: [orderStatuses.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [orderStatuses.updatedBy], references: [users.id] }),
}));

export default orderStatuses;
