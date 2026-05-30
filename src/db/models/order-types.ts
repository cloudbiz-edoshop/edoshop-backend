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

export const orderTypes = pgTable("order_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const orderTypesSchema = createSelectSchema(orderTypes);
export type OrderTypes = z.infer<typeof orderTypesSchema>;
export const insertOrderTypesSchema = createInsertSchema(orderTypes);
export type NewOrderTypes = z.infer<typeof insertOrderTypesSchema>;
export default orderTypes;

export const orderTypesRelations = relations(orderTypes, ({ one, many }) => ({
  orders: many(orders),
  createdBy: one(users, { fields: [orderTypes.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [orderTypes.updatedBy], references: [users.id] }),
}));
