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

import { customers } from "./customers";
import { entries } from "./entries";
import { users } from "./users";

export const returns = pgTable("returns", {
  id: serial().primaryKey(),
  entryId: integer()
    .notNull()
    .references(() => entries.id), // Return entry
  entryType: varchar({ length: 255 }).notNull(), // e.g., Bundles, Items
  originalEntryId: integer()
    .notNull()
    .references(() => entries.id), // Original product
  customerId: integer()
    .notNull()
    .references(() => customers.id),
  isOpen: boolean().default(false).notNull(),

  orderId: varchar({ length: 255 }), // For package returns
  createdAt: timestamp({ mode: "string" }).notNull(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const returnsSchema = createSelectSchema(returns);
export type Returns = z.infer<typeof returnsSchema>;
export const insertReturnsSchema = createInsertSchema(returns);
export type NewReturns = z.infer<typeof insertReturnsSchema>;

export const returnsRelations = relations(returns, ({ one }) => ({
  returnEntry: one(entries, {
    fields: [returns.entryId],
    references: [entries.id],
    relationName: "returnEntry",
  }),
  originalEntry: one(entries, {
    fields: [returns.originalEntryId],
    references: [entries.id],
    relationName: "originalEntry",
  }),
  customer: one(customers, {
    fields: [returns.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [returns.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [returns.updatedBy],
    references: [users.id],
  }),
}));
export default returns;
