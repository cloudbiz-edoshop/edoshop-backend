import type { z } from "zod";

import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { bins } from "./bins";
import { entries } from "./entries";
import { users } from "./users";

export const storage = pgTable("storage", {
  id: serial().primaryKey(),
  binId: integer().notNull().references(() => bins.id),
  entryId: integer().notNull().references(() => entries.id),
  action: boolean().notNull().default(true), // true = entered, false = removed
  quantity: integer().notNull().default(0),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().references(() => users.id).notNull(),
  updatedBy: integer().references(() => users.id),
});

export const storageSchema = createSelectSchema(storage);
export type Storage = z.infer<typeof storageSchema>;

export const createStorageSchema = createInsertSchema(storage);
export type CreateStorage = z.infer<typeof createStorageSchema>;

export const storageRelations = relations(storage, ({ one }) => ({
  bin: one(bins, { fields: [storage.binId], references: [bins.id] }),
  entry: one(entries, {
    fields: [storage.entryId],
    references: [entries.id],
  }),
}));

export default storage;
