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

import { users } from "./users";

export const filters = pgTable("filters", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const filtersSchema = createSelectSchema(filters);

export type Filters = z.infer<typeof filtersSchema>;

/**
 * Filters insert schema
 */
export const insertFiltersSchema = createInsertSchema(filters);

/**
 * New filters type definition
 */
export type NewFilters = z.infer<typeof insertFiltersSchema>;

export default filters;

export const filtersRelations = relations(filters, ({ one }) => ({
  createdBy: one(users, {
    fields: [filters.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [filters.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [filters.deletedBy],
    references: [users.id],
  }),
}));
