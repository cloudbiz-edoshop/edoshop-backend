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

export const designPatterns = pgTable("design_patterns", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).unique().notNull(),
  description: varchar({ length: 255 }),
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

export const designPatternsSchema = createSelectSchema(designPatterns);

export type DesignPatterns = z.infer<typeof designPatternsSchema>;

export const insertDesignPatternsSchema = createInsertSchema(designPatterns);

export type NewDesignPatterns = z.infer<typeof insertDesignPatternsSchema>;

export default designPatterns;

export const designPatternsRelations = relations(designPatterns, ({ one }) => ({
  createdBy: one(users, {
    fields: [designPatterns.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [designPatterns.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [designPatterns.deletedBy],
    references: [users.id],
  }),
}));
