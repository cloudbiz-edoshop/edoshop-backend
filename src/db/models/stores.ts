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

export const stores = pgTable("stores", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  createdAt: timestamp({ mode: "string" }).defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
  isDeleted: boolean().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const storesSchema = createSelectSchema(stores);

export type Stores = z.infer<typeof storesSchema>;

/**
 * Stores insert schema
 */
export const insertStoresSchema = createInsertSchema(stores);

/**
 * New stores type definition
 */
export type NewStores = z.infer<typeof insertStoresSchema>;

export default stores;

export const storesRelations = relations(stores, ({ one }) => ({
  createdBy: one(users, {
    fields: [stores.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [stores.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [stores.deletedBy],
    references: [users.id],
  }),
}));
