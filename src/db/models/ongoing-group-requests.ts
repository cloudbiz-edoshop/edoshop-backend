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

import { groupApprovalStatuses } from "./group-approval-statuses";
import { ongoingGroups } from "./ongoing-groups";
import { products } from "./products";
import { users } from "./users";
import { variants } from "./variants";

export const ongoingGroupRequests = pgTable("ongoing_group_requests", {
  id: serial().primaryKey(),
  ongoingGroupId: integer().references(() => ongoingGroups.id).notNull(),
  requestedBy: integer().references(() => users.id).notNull(),
  productId: integer().references(() => products.id).notNull(),
  variantId: integer().references(() => variants.id).notNull(),
  quantity: integer().notNull(),
  approvalStatusId: integer().references(() => groupApprovalStatuses.id).notNull(),
  reasonForRejection: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const ongoingGroupRequestsSchema = createSelectSchema(ongoingGroupRequests);
export type OngoingGroupRequests = z.infer<typeof ongoingGroupRequestsSchema>;
export const insertOngoingGroupRequestsSchema = createInsertSchema(ongoingGroupRequests);
export type NewOngoingGroupRequests = z.infer<typeof insertOngoingGroupRequestsSchema>;

export default ongoingGroupRequests;

export const ongoingGroupRequestsRelations = relations(ongoingGroupRequests, ({ one }) => ({
  ongoingGroup: one(ongoingGroups, {
    fields: [ongoingGroupRequests.ongoingGroupId],
    references: [ongoingGroups.id],
  }),
  requestedBy: one(users, {
    fields: [ongoingGroupRequests.requestedBy],
    references: [users.id],
  }),
  product: one(products, {
    fields: [ongoingGroupRequests.productId],
    references: [products.id],
  }),
  variant: one(variants, {
    fields: [ongoingGroupRequests.variantId],
    references: [variants.id],
  }),
  approvalStatus: one(groupApprovalStatuses, {
    fields: [ongoingGroupRequests.approvalStatusId],
    references: [groupApprovalStatuses.id],
  }),
  createdBy: one(users, {
    fields: [ongoingGroupRequests.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [ongoingGroupRequests.updatedBy],
    references: [users.id],
  }),
}));
