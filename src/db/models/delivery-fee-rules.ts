import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { deliveryPlans } from "./delivery-plans";

export const deliveryFeeRules = pgTable("delivery_fee_rules", {
  id: serial("id").primaryKey(),
  deliveryPlanId: integer("delivery_plan_id")
    .references(() => deliveryPlans.id, { onDelete: "cascade" })
    .notNull(),
  minDistanceKm: numeric("min_distance_km", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  maxDistanceKm: numeric("max_distance_km", { precision: 10, scale: 2 }),
  minWeightKg: numeric("min_weight_kg", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  maxWeightKg: numeric("max_weight_kg", { precision: 10, scale: 2 }),
  maxLengthCm: integer("max_length_cm"),
  maxWidthCm: integer("max_width_cm"),
  maxHeightCm: integer("max_height_cm"),
  fee: integer("fee").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const deliveryFeeRulesSchema = createSelectSchema(deliveryFeeRules);
export type DeliveryFeeRule = z.infer<typeof deliveryFeeRulesSchema>;
export const insertDeliveryFeeRuleSchema = createInsertSchema(deliveryFeeRules);
export type NewDeliveryFeeRule = z.infer<typeof insertDeliveryFeeRuleSchema>;

export const deliveryFeeRulesRelations = relations(deliveryFeeRules, ({ one }) => ({
  deliveryPlan: one(deliveryPlans, {
    fields: [deliveryFeeRules.deliveryPlanId],
    references: [deliveryPlans.id],
  }),
}));

export default deliveryFeeRules;
