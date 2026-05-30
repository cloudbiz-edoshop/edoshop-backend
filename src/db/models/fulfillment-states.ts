import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { orderItems } from "./order-items";
import { users } from "./users";

export const fulfillmentStates = pgTable("fulfillment_states", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull().unique(),
  stepOrder: integer().notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  updatedBy: integer().references(() => users.id),
});

export const fulfillmentStatesSchema = createSelectSchema(fulfillmentStates);
export type FulfillmentStates = z.infer<typeof fulfillmentStatesSchema>;
export const createFulfillmentStateSchema = createInsertSchema(fulfillmentStates);
export type CreateFulfillmentState = z.infer<typeof createFulfillmentStateSchema>;
export const updateFulfillmentStateSchema = createInsertSchema(fulfillmentStates);

export default fulfillmentStates;

export const fulfillmentStatesRelations = relations(fulfillmentStates, ({ many }) => ({
  orderItems: many(orderItems),
}));
