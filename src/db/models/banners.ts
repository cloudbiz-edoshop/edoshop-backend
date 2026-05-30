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

// Table banners {
//   id int [primary key]
//   heading varchar
//   heading_font_color varchar
//   heading_font_size varchar
//   heading_font_weight varchar
//   subtext varchar
//   subtext_font_color varchar
//   subtext_font_size varchar
//   subtext_font_weight varchar
//   primary_button_text varchar
//   secondary_button_text varchar
//   delay decimal [note: 'Time delay in ms']
//   date date
//   image_url varchar
//   created_at timestamp [not null]
//   updated_at timestamp
//   created_by int [ref: > users.id]
//   updated_by int [ref: > users.id]
// }

export const banners = pgTable("banners", {
  id: serial().primaryKey(),
  heading: varchar({ length: 255 }).notNull(),
  headingFontColor: varchar({ length: 255 }).notNull(),
  headingFontSize: varchar({ length: 255 }).notNull(),
  headingFontWeight: varchar({ length: 255 }).notNull(),
  subtext: varchar({ length: 255 }).notNull(),
  subtextFontColor: varchar({ length: 255 }).notNull(),
  subtextFontSize: varchar({ length: 255 }).notNull(),
  subtextFontWeight: varchar({ length: 255 }).notNull(),
  primaryButtonText: varchar({ length: 255 }).notNull(),
  secondaryButtonText: varchar({ length: 255 }).notNull(),
  delay: decimal({ precision: 10, scale: 2 }).notNull(),
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

export const bannersSchema = createSelectSchema(banners);

export type Banners = z.infer<typeof bannersSchema>;

/**
 * Banners insert schema
 */
export const insertBannersSchema = createInsertSchema(banners);

/**
 * New banners type definition
 */
export type NewBanners = z.infer<typeof insertBannersSchema>;

export default banners;

export const bannersRelations = relations(banners, ({ one }) => ({
  createdBy: one(users, {
    fields: [banners.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [banners.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [banners.deletedBy],
    references: [users.id],
  }),
}));
