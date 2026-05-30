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
// Table testimonials {
//   id int [primary key]
//   order int [unique]
//   author_name varchar
//   author_title varchar
//   testimonial varchar
//   image_url varchar
//   created_at timestamp [not null]
//   updated_at timestamp
//   created_by int [ref: > users.id]
//   updated_by int [ref: > users.id]
// }
export const testimonials = pgTable("testimonials", {
  id: serial().primaryKey(),
  order: integer().notNull().unique(),
  authorName: varchar({ length: 255 }).notNull(),
  authorTitle: varchar({ length: 255 }).notNull(),
  testimonial: varchar({ length: 255 }).notNull(),
  imageUrl: varchar({ length: 255 }),
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

export const testimonialsSchema = createSelectSchema(testimonials);

export type Testimonials = z.infer<typeof testimonialsSchema>;

/**
 * Testimonials insert schema
 */
export const insertTestimonialsSchema = createInsertSchema(testimonials);

/**
 * New testimonials type definition
 */
export type NewTestimonials = z.infer<typeof insertTestimonialsSchema>;

export default testimonials;

export const testimonialsRelations = relations(testimonials, ({ one }) => ({
  createdBy: one(users, {
    fields: [testimonials.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [testimonials.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [testimonials.deletedBy],
    references: [users.id],
  }),
}));
