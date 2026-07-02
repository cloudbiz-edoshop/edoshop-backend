import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import notifications from "./notifications";
import users from "./users";

export const notificationRecipients = pgTable("notification_recipients", {
  id: serial().primaryKey(),
  notificationId: integer()
    .references(() => notifications.id)
    .notNull(),
  userId: integer()
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const notificationRecipientsSchema =
  createSelectSchema(notificationRecipients);
export type NotificationRecipient = z.infer<typeof notificationRecipientsSchema>;
export const insertNotificationRecipientsSchema =
  createInsertSchema(notificationRecipients);
export type NewNotificationRecipient = z.infer<
  typeof insertNotificationRecipientsSchema
>;

export const notificationRecipientsRelations = relations(
  notificationRecipients,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [notificationRecipients.notificationId],
      references: [notifications.id],
    }),
    user: one(users, {
      fields: [notificationRecipients.userId],
      references: [users.id],
    }),
  }),
);

export default notificationRecipients;
