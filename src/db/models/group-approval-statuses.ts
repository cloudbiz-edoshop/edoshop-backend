import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const groupApprovalStatuses = pgTable("group_approval_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const groupApprovalStatusesSchema = createSelectSchema(groupApprovalStatuses);
export type GroupApprovalStatuses = z.infer<typeof groupApprovalStatusesSchema>;
export const insertGroupApprovalStatusesSchema = createInsertSchema(groupApprovalStatuses);
export type NewGroupApprovalStatuses = z.infer<typeof insertGroupApprovalStatusesSchema>;

export default groupApprovalStatuses;

export const groupApprovalStatusesRelations = relations(groupApprovalStatuses, ({ one }) => ({
  createdBy: one(users, {
    fields: [groupApprovalStatuses.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [groupApprovalStatuses.updatedBy],
    references: [users.id],
  }),
}));
