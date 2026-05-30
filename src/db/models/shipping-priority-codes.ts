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

import { shippingLabels } from "./shipping-labels";
import { users } from "./users";

export const shippingPriorityCodes = pgTable("shipping_priority_codes", {
  id: serial().primaryKey(),
  code: varchar({ length: 20 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedBy: integer().references(() => users.id).notNull(),
});
export const shippingPriorityCodesSchema = createSelectSchema(shippingPriorityCodes);
export type ShippingPriorityCode = z.infer<typeof shippingPriorityCodesSchema>;
export const insertShippingPriorityCodeSchema = createInsertSchema(shippingPriorityCodes);
export type NewShippingPriorityCode = z.infer<typeof insertShippingPriorityCodeSchema>;
export const shippingPriorityCodesRelations = relations(
  shippingPriorityCodes,
  ({ many }) => ({
    shippingLabels: many(shippingLabels),
  }),
);
export default shippingPriorityCodes;
