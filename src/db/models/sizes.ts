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

export const sizes = pgTable("sizes", {
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

export const sizesSchema = createSelectSchema(sizes);

export type Sizes = z.infer<typeof sizesSchema>;

export const newSizesSchema = createInsertSchema(sizes);

export type NewSizes = z.infer<typeof newSizesSchema>;

export default sizes;

export const sizesRelations = relations(sizes, ({ one }) => ({
  createdBy: one(users, {
    fields: [sizes.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [sizes.updatedBy],
    references: [users.id],
  }),
}));
