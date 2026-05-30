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

import { notificationFrequencies } from "./notification-frequencies";
import notificationTypes from "./notification-types";
import { recipientTypes } from "./recipient-types";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  message: varchar({ length: 255 }).notNull(),
  notificationTypeId: integer()
    .references(() => notificationTypes.id)
    .notNull(),
  notificationFrequencyId: integer()
    .references(() => notificationFrequencies.id)
    .notNull(),
  recipientTypeId: integer()
    .references(() => recipientTypes.id)
    .notNull(),
  lastSentAt: timestamp({ mode: "string" }),
  nextSendAt: timestamp({ mode: "string" }),
  status: varchar({ length: 255 }).default("pending").notNull(),
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

export const notificationsSchema = createSelectSchema(notifications);

export type Notifications = z.infer<typeof notificationsSchema>;

/**
 * Notifications insert schema
 */
export const insertNotificationsSchema = createInsertSchema(notifications);

/**
 * New notifications type definition
 */
export type NewNotifications = z.infer<typeof insertNotificationsSchema>;

export default notifications;

export const notificationsRelations = relations(notifications, ({ one }) => ({
  createdBy: one(users, {
    fields: [notifications.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [notifications.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [notifications.deletedBy],
    references: [users.id],
  }),
  notificationType: one(notificationTypes, {
    fields: [notifications.notificationTypeId],
    references: [notificationTypes.id],
  }),
  notificationFrequency: one(notificationFrequencies, {
    fields: [notifications.notificationFrequencyId],
    references: [notificationFrequencies.id],
  }),
  recipientType: one(recipientTypes, {
    fields: [notifications.recipientTypeId],
    references: [recipientTypes.id],
  }),
}));
