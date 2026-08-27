import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export type TermsContact = {
  website?: string;
  email?: string;
  phones?: string[];
};

export type TermsSection = {
  id: number;
  title: string;
  body: string[];
  subsections?: {
    title: string;
    body: string[];
  }[];
};

export const terms = pgTable("terms", {
  id: serial().primaryKey(),
  languageCode: varchar("language_code", { length: 5 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  effectiveDate: varchar("effective_date", { length: 100 }).notNull(),
  version: varchar({ length: 50 }).notNull(),
  acceptanceLabel: varchar("acceptance_label").notNull(),
  contact: jsonb().$type<TermsContact>().notNull().default({}),
  sections: jsonb().$type<TermsSection[]>().notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedBy: integer("updated_by")
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
  deletedBy: integer("deleted_by").references(() => users.id),
});

export const termsSchema = createSelectSchema(terms);
export type Terms = z.infer<typeof termsSchema>;
export const insertTermsSchema = createInsertSchema(terms);
export type NewTerms = z.infer<typeof insertTermsSchema>;

export default terms;

export const termsRelations = relations(terms, ({ one }) => ({
  createdByUser: one(users, {
    fields: [terms.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [terms.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [terms.deletedBy],
    references: [users.id],
  }),
}));
