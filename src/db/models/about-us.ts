import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const aboutUs = pgTable("about-us", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  heading: varchar({ length: 255 }).notNull(),
  text: varchar({ length: 255 }).notNull(),
  primaryButtonText: varchar({ length: 255 }).notNull(),
  delay: decimal({ precision: 10, scale: 2 }).notNull().$type<number>(),
  date: date().notNull(),
  imageUrl: varchar({ length: 255 }).notNull(),
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

export const aboutUsSchema = createSelectSchema(aboutUs);

export type AboutUs = z.infer<typeof aboutUsSchema>;

/**
 * AboutUs insert schema
 */
export const insertAboutUsSchema = createInsertSchema(aboutUs);

/**
 * New aboutUs type definition
 */
export type NewAboutUs = z.infer<typeof insertAboutUsSchema>;

export default aboutUs;

export const aboutUsRelations = relations(aboutUs, ({ one }) => ({
  createdBy: one(users, {
    fields: [aboutUs.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [aboutUs.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [aboutUs.deletedBy],
    references: [users.id],
  }),
}));
