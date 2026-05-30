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

export const faqs = pgTable("faqs", {
  id: serial().primaryKey(),
  order: integer().notNull(),
  question: varchar({ length: 255 }).notNull(),
  answer: varchar({ length: 255 }).notNull(),
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

export const faqsSchema = createSelectSchema(faqs);

export type Faqs = z.infer<typeof faqsSchema>;

/**
 * Faqs insert schema
 */
export const insertFaqsSchema = createInsertSchema(faqs);

/**
 * New faqs type definition
 */
export type NewFaqs = z.infer<typeof insertFaqsSchema>;

export default faqs;

export const faqsRelations = relations(faqs, ({ one }) => ({
  createdBy: one(users, {
    fields: [faqs.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [faqs.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [faqs.deletedBy],
    references: [users.id],
  }),
}));
