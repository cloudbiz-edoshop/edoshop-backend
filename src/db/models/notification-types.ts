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

export const notificationTypes = pgTable("notification_types", {
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

export const notificationTypesSchema = createSelectSchema(notificationTypes);

export type NotificationTypes = z.infer<typeof notificationTypesSchema>;

/**
 * NotificationTypes insert schema
 */
export const insertNotificationTypesSchema =
  createInsertSchema(notificationTypes);

/**
 * New notificationTypes type definition
 */
export type NewNotificationTypes = z.infer<
  typeof insertNotificationTypesSchema
>;

export default notificationTypes;

export const notificationTypesRelations = relations(
  notificationTypes,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [notificationTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [notificationTypes.updatedBy],
      references: [users.id],
    }),
    deletedBy: one(users, {
      fields: [notificationTypes.deletedBy],
      references: [users.id],
    }),
  }),
);
