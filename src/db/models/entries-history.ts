import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  date,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import entries from "./entries";
import { entryStates } from "./entry-states";
import entryTypes from "./entry-types";
import suppliers from "./suppliers";
import { users } from "./users";
import warehouses from "./warehouses";

export const entriesHistory = pgTable("entries_history", {
  id: serial().primaryKey(),
  entryId: integer().references(() => entries.id),
  entryTypeId: integer().references(() => entryTypes.id),
  entryStateId: integer().references(() => entryStates.id),
  quantity: integer().notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  date: date().notNull(),
  imageUrl1: varchar({ length: 255 }),
  imageUrl2: varchar({ length: 255 }),
  warehouseId: integer().references(() => warehouses.id),
  supplierId: integer().references(() => suppliers.id),
  description: varchar({ length: 255 }),
  version: integer().notNull().default(1),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  operation: varchar({ length: 255 }).notNull(), // INSERT, UPDATE, DELETE
  changedBy: integer().references(() => users.id),
  validFrom: timestamp({ mode: "string" }).notNull().defaultNow(),
  validTo: timestamp({ mode: "string" }),
});

export const entriesHistoryRelations = relations(entriesHistory, ({ one }) => ({
  entry: one(entries, {
    fields: [entriesHistory.entryId],
    references: [entries.id],
  }),
}));

export const insertEntriesHistorySchema = createInsertSchema(entriesHistory);

export const selectEntriesHistorySchema = createSelectSchema(entriesHistory);

export type NewEntriesHistory = z.infer<typeof insertEntriesHistorySchema>;

export type EntriesHistory = z.infer<typeof selectEntriesHistorySchema>;

export default entriesHistory;
