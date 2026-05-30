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

export const recipientTypes = pgTable("recipient_types", {
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

export const recipientTypesSchema = createSelectSchema(recipientTypes);

export type RecipientTypes = z.infer<typeof recipientTypesSchema>;

/**
 * RecipientTypes insert schema
 */
export const insertRecipientTypesSchema = createInsertSchema(recipientTypes);

/**
 * New recipientTypes type definition
 */
export type NewRecipientTypes = z.infer<typeof insertRecipientTypesSchema>;

export default recipientTypes;

export const recipientTypesRelations = relations(recipientTypes, ({ one }) => ({
  createdBy: one(users, {
    fields: [recipientTypes.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [recipientTypes.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [recipientTypes.deletedBy],
    references: [users.id],
  }),
}));
