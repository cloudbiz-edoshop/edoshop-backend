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

import users from "./users";

export const userNotificationPreferences = pgTable(
  "user_notification_preferences",
  {
    id: serial().primaryKey(),
    userId: integer()
      .references(() => users.id)
      .notNull(),
    preferenceKey: varchar({ length: 100 }).notNull(),
    enabled: boolean().notNull().default(true),
    createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_notification_preferences_unique").on(
      table.userId,
      table.preferenceKey,
    ),
  ],
);

export const userNotificationPreferencesSchema = createSelectSchema(
  userNotificationPreferences,
);
export type UserNotificationPreference = z.infer<
  typeof userNotificationPreferencesSchema
>;
export const insertUserNotificationPreferencesSchema = createInsertSchema(
  userNotificationPreferences,
);
export type NewUserNotificationPreference = z.infer<
  typeof insertUserNotificationPreferencesSchema
>;

export const userNotificationPreferencesRelations = relations(
  userNotificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationPreferences.userId],
      references: [users.id],
    }),
  }),
);

export default userNotificationPreferences;
