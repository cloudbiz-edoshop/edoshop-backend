import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { groupApprovalStatuses } from "./group-approval-statuses";
import { products } from "./products";
import { users } from "./users";

export const ongoingGroups = pgTable("ongoing_groups", {
  id: serial().primaryKey(),
  productId: integer().references(() => products.id).notNull(),
  orderedItems: integer().notNull().default(0),
  totalItems: integer().notNull(),
  thresholdToValidate: integer().notNull(),
  statusId: integer().references(() => groupApprovalStatuses.id).notNull(),
  approvalDate: date(),
  approvedBy: integer().references(() => users.id),
  reasonForRejection: varchar({ length: 255 }),
  rejectionDate: date(),
  rejectedBy: integer().references(() => users.id),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const ongoingGroupsSchema = createSelectSchema(ongoingGroups);
export type OngoingGroups = z.infer<typeof ongoingGroupsSchema>;
export const insertOngoingGroupsSchema = createInsertSchema(ongoingGroups);
export type NewOngoingGroups = z.infer<typeof insertOngoingGroupsSchema>;

export default ongoingGroups;

export const ongoingGroupsRelations = relations(ongoingGroups, ({ one }) => ({
  product: one(products, {
    fields: [ongoingGroups.productId],
    references: [products.id],
  }),
  status: one(groupApprovalStatuses, {
    fields: [ongoingGroups.statusId],
    references: [groupApprovalStatuses.id],
  }),
  approvedBy: one(users, {
    fields: [ongoingGroups.approvedBy],
    references: [users.id],
  }),
  rejectedBy: one(users, {
    fields: [ongoingGroups.rejectedBy],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [ongoingGroups.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [ongoingGroups.updatedBy],
    references: [users.id],
  }),
}));
