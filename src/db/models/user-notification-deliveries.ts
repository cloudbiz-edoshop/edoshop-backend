import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import notifications from "./notifications";
import users from "./users";

export const userNotificationDeliveries = pgTable(
  "user_notification_deliveries",
  {
    id: serial().primaryKey(),
    notificationId: integer().references(() => notifications.id),
    userId: integer()
      .references(() => users.id)
      .notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: varchar({ length: 255 }).notNull(),
    categoryKey: varchar({ length: 100 }).notNull(),
    channel: varchar({ length: 50 }).notNull().default("webapp"),
    isRead: boolean().notNull().default(false),
    readAt: timestamp({ mode: "string" }),
  actionUrl: varchar({ length: 1024 }),
  referenceType: varchar({ length: 64 }),
  referenceId: integer(),
  audience: varchar({ length: 20 }).notNull().default("customer"),
  isActive: boolean().notNull().default(true),
    deactivatedAt: timestamp({ mode: "string" }),
    sentAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_notification_deliveries_unique").on(
      table.notificationId,
      table.userId,
      table.channel,
    ),
  ],
);

export const userNotificationDeliveriesSchema = createSelectSchema(
  userNotificationDeliveries,
);
export type UserNotificationDelivery = z.infer<
  typeof userNotificationDeliveriesSchema
>;
export const insertUserNotificationDeliveriesSchema = createInsertSchema(
  userNotificationDeliveries,
);
export type NewUserNotificationDelivery = z.infer<
  typeof insertUserNotificationDeliveriesSchema
>;

export const userNotificationDeliveriesRelations = relations(
  userNotificationDeliveries,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [userNotificationDeliveries.notificationId],
      references: [notifications.id],
    }),
    user: one(users, {
      fields: [userNotificationDeliveries.userId],
      references: [users.id],
    }),
  }),
);

export default userNotificationDeliveries;
