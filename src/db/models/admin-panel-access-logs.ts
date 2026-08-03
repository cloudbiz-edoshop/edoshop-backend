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

export const adminPanelAccessLogs = pgTable("admin_panel_access_logs", {
  id: serial().primaryKey(),
  userId: integer().references(() => users.id),
  loginIdentifier: varchar({ length: 255 }),
  authMethod: varchar({ length: 64 }).notNull(),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  success: boolean().notNull().default(true),
  failureReason: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const adminPanelAccessLogsRelations = relations(
  adminPanelAccessLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [adminPanelAccessLogs.userId],
      references: [users.id],
    }),
  }),
);

export const adminPanelAccessLogSchema =
  createSelectSchema(adminPanelAccessLogs);
export type AdminPanelAccessLog = z.infer<typeof adminPanelAccessLogSchema>;

export const insertAdminPanelAccessLogSchema =
  createInsertSchema(adminPanelAccessLogs);
export type NewAdminPanelAccessLog = z.infer<
  typeof insertAdminPanelAccessLogSchema
>;

export default adminPanelAccessLogs;
