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

export const colors = pgTable("colors", {
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

export const colorsSchema = createSelectSchema(colors);

export type Colors = z.infer<typeof colorsSchema>;

/**
 * Colors insert schema
 */
export const insertColorsSchema = createInsertSchema(colors);

/**
 * New colors type definition
 */
export type NewColors = z.infer<typeof insertColorsSchema>;

export default colors;

export const colorsRelations = relations(colors, ({ one }) => ({
  createdBy: one(users, {
    fields: [colors.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [colors.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [colors.deletedBy],
    references: [users.id],
  }),
}));
