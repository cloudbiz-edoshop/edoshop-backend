import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const trackingSteps = pgTable("tracking_steps", {
  id: serial().primaryKey(),
  stepOrder: integer().notNull(),
  code: varchar({ length: 100 }).unique().notNull(),
  label: varchar({ length: 255 }).notNull(),
  leg: varchar({ length: 50 }).notNull(),
  description: text(),
});

export const trackingBundles = pgTable("tracking_bundles", {
  id: serial().primaryKey(),
  bundleCode: varchar({ length: 100 }).unique().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  storeType: varchar({ length: 50 }).notNull(),
  status: varchar({ length: 50 }).notNull().default("active"),
  currentStepId: integer()
    .notNull()
    .references(() => trackingSteps.id),
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const trackingBundleItems = pgTable("tracking_bundle_items", {
  id: serial().primaryKey(),
  bundleId: integer()
    .notNull()
    .references(() => trackingBundles.id, { onDelete: "cascade" }),
  orderId: integer().notNull().unique(),
  createdAt: timestamp({ mode: "string" }).notNull(),
  createdBy: integer().references(() => users.id),
});

export const trackingBundleHistory = pgTable("tracking_bundle_history", {
  id: serial().primaryKey(),
  bundleId: integer()
    .notNull()
    .references(() => trackingBundles.id, { onDelete: "cascade" }),
  stepId: integer()
    .notNull()
    .references(() => trackingSteps.id),
  notes: text(),
  attachmentUrl: varchar({ length: 500 }),
  createdAt: timestamp({ mode: "string" }).notNull(),
  createdBy: integer().references(() => users.id),
});

export const trackingStepsSchema = createSelectSchema(trackingSteps);
export type TrackingSteps = z.infer<typeof trackingStepsSchema>;

export const trackingBundlesSchema = createSelectSchema(trackingBundles);
export type TrackingBundles = z.infer<typeof trackingBundlesSchema>;
export const insertTrackingBundlesSchema = createInsertSchema(trackingBundles);
export type NewTrackingBundles = z.infer<typeof insertTrackingBundlesSchema>;

export const trackingBundleItemsSchema = createSelectSchema(trackingBundleItems);
export type TrackingBundleItems = z.infer<typeof trackingBundleItemsSchema>;

export const trackingBundleHistorySchema = createSelectSchema(trackingBundleHistory);
export type TrackingBundleHistory = z.infer<typeof trackingBundleHistorySchema>;

export const trackingStepsRelations = relations(trackingSteps, ({ many }) => ({
  bundles: many(trackingBundles),
  history: many(trackingBundleHistory),
}));

export const trackingBundlesRelations = relations(trackingBundles, ({ one, many }) => ({
  currentStep: one(trackingSteps, {
    fields: [trackingBundles.currentStepId],
    references: [trackingSteps.id],
  }),
  createdByUser: one(users, {
    fields: [trackingBundles.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [trackingBundles.updatedBy],
    references: [users.id],
  }),
  items: many(trackingBundleItems),
  history: many(trackingBundleHistory),
}));

export const trackingBundleItemsRelations = relations(trackingBundleItems, ({ one }) => ({
  bundle: one(trackingBundles, {
    fields: [trackingBundleItems.bundleId],
    references: [trackingBundles.id],
  }),
}));

export const trackingBundleHistoryRelations = relations(trackingBundleHistory, ({ one }) => ({
  bundle: one(trackingBundles, {
    fields: [trackingBundleHistory.bundleId],
    references: [trackingBundles.id],
  }),
  step: one(trackingSteps, {
    fields: [trackingBundleHistory.stepId],
    references: [trackingSteps.id],
  }),
  createdByUser: one(users, {
    fields: [trackingBundleHistory.createdBy],
    references: [users.id],
  }),
}));

export default trackingBundles;
