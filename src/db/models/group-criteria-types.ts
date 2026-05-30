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

import { dropshippingProducts } from "./dropshipping-products";
import { users } from "./users";

export const groupCriteriaTypes = pgTable("group_criteria_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const groupCriteriaTypesSchema = createSelectSchema(groupCriteriaTypes);
export type GroupCriteriaTypes = z.infer<typeof groupCriteriaTypesSchema>;
export const insertGroupCriteriaTypesSchema = createInsertSchema(groupCriteriaTypes);
export type NewGroupCriteriaTypes = z.infer<typeof insertGroupCriteriaTypesSchema>;

export default groupCriteriaTypes;

export const groupCriteriaTypesRelations = relations(groupCriteriaTypes, ({ one, many }) => ({
  groupCriteria: many(dropshippingProducts),
  createdBy: one(users, {
    fields: [groupCriteriaTypes.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [groupCriteriaTypes.updatedBy],
    references: [users.id],
  }),
}));
