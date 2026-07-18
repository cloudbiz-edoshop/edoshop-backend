import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const deliveryPlans = pgTable("delivery_plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  leadTime: varchar("lead_time", { length: 255 }).notNull(),
  description: text("description").notNull(),
  fee: integer("fee").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedBy: integer("updated_by")
    .references(() => users.id)
    .notNull(),
});

export const deliveryPlansSchema = createSelectSchema(deliveryPlans);
export type DeliveryPlan = z.infer<typeof deliveryPlansSchema>;
export const insertDeliveryPlanSchema = createInsertSchema(deliveryPlans);
export type NewDeliveryPlan = z.infer<typeof insertDeliveryPlanSchema>;

export const deliveryPlansRelations = relations(deliveryPlans, ({ one }) => ({
  createdByUser: one(users, {
    fields: [deliveryPlans.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [deliveryPlans.updatedBy],
    references: [users.id],
  }),
}));

export default deliveryPlans;
