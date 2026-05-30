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

export const shippingTypes = pgTable("shipping_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedBy: integer().references(() => users.id).notNull(),
});

export const shippingTypesSchema = createSelectSchema(shippingTypes);
export type ShippingType = z.infer<typeof shippingTypesSchema>;
export const insertShippingTypeSchema = createInsertSchema(shippingTypes);
export type NewShippingType = z.infer<typeof insertShippingTypeSchema>;

export default shippingTypes;

export const shippingTypesRelations = relations(
  shippingTypes,
  ({ many }) => ({
    shippingLabels: many(shippingLabels),
  }),
);
