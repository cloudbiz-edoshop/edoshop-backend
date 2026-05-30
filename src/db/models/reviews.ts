import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { products } from "./products";
import { reviewStatuses } from "./review-statuses";
import { users } from "./users";

export const reviews = pgTable("reviews", {
  id: serial().primaryKey(),
  reviewDate: date("review_date"),
  approvedDate: date("approved_date"),
  productId: integer()
    .references(() => products.id)
    .notNull(),
  review: varchar({ length: 1000 }),
  rating: integer("rating").notNull().default(0),
  statusId: integer()
    .references(() => reviewStatuses.id)
    .notNull(),
  itemsReceived: integer("items_received"),
  itemsRejected: integer("items_rejected"),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const reviewsSchema = createSelectSchema(reviews);
export type Reviews = z.infer<typeof reviewsSchema>;
export const insertReviewsSchema = createInsertSchema(reviews);
export type NewReviews = z.infer<typeof insertReviewsSchema>;

export default reviews;

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  status: one(reviewStatuses, {
    fields: [reviews.statusId],
    references: [reviewStatuses.id],
  }),
  createdBy: one(users, {
    fields: [reviews.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [reviews.updatedBy],
    references: [users.id],
  }),
}));
