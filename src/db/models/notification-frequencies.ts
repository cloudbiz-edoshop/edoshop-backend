import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const notificationFrequencies = pgTable("notification_frequencies", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const notificationFrequenciesSchema = createSelectSchema(
  notificationFrequencies,
);

export type NotificationFrequencies = z.infer<
  typeof notificationFrequenciesSchema
>;

/**
 * NotificationFrequencies insert schema
 */
export const insertNotificationFrequenciesSchema = createInsertSchema(
  notificationFrequencies,
);

/**
 * New notificationTypes type definition
 */
export type NewNotificationFrequencies = z.infer<
  typeof insertNotificationFrequenciesSchema
>;

export default notificationFrequencies;

export const notificationFrequenciesRelations = relations(
  notificationFrequencies,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [notificationFrequencies.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [notificationFrequencies.updatedBy],
      references: [users.id],
    }),
    deletedBy: one(users, {
      fields: [notificationFrequencies.deletedBy],
      references: [users.id],
    }),
  }),
);
