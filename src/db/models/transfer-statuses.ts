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

export const transferStatuses = pgTable("transfer_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 50 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const transferStatusesSchema = createSelectSchema(transferStatuses);
export type TransferStatuses = z.infer<typeof transferStatusesSchema>;
export const insertTransferStatusesSchema = createInsertSchema(transferStatuses);
export type NewTransferStatuses = z.infer<typeof insertTransferStatusesSchema>;

export const transferStatusesRelations = relations(transferStatuses, ({ one }) => ({
  createdBy: one(users, {
    fields: [transferStatuses.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [transferStatuses.updatedBy],
    references: [users.id],
  }),
}));

export default transferStatuses;
