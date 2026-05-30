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

import { discounts } from "./discounts";
import { users } from "./users";

export const discountTypes = pgTable("discount_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const discountTypesSchema = createSelectSchema(discountTypes);
export type DiscountType = z.infer<typeof discountTypesSchema>;
export const insertDiscountTypeSchema = createInsertSchema(discountTypes);
export type NewDiscountType = z.infer<typeof insertDiscountTypeSchema>;

export const discountTypesRelations = relations(
  discountTypes,
  ({ many, one }) => ({
    discounts: many(discounts),
    createdBy: one(users, {
      fields: [discountTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [discountTypes.updatedBy],
      references: [users.id],
    }),
  }),
);

export default discountTypes;
