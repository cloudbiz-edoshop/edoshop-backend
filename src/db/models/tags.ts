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

export const tags = pgTable("tags", {
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

export const tagsSchema = createSelectSchema(tags);

export type Tags = z.infer<typeof tagsSchema>;

/**
 * Tags insert schema
 */
export const insertTagsSchema = createInsertSchema(tags);

/**
 * New tags type definition
 */
export type NewTags = z.infer<typeof insertTagsSchema>;

export default tags;

export const tagsRelations = relations(tags, ({ one }) => ({
  createdBy: one(users, {
    fields: [tags.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [tags.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [tags.deletedBy],
    references: [users.id],
  }),
}));
