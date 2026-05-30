import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { reviews } from "./reviews";
import { users } from "./users";

export const reviewStatuses = pgTable("review_statuses", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer().references(() => users.id),
  updatedBy: integer().references(() => users.id),
});

export const reviewStatusesSchema = createSelectSchema(reviewStatuses);
export type ReviewStatuses = z.infer<typeof reviewStatusesSchema>;
export const insertReviewStatusesSchema = createInsertSchema(reviewStatuses);
export type NewReviewStatuses = z.infer<typeof insertReviewStatusesSchema>;

export default reviewStatuses;

export const reviewStatusesRelations = relations(
  reviewStatuses,
  ({ one, many }) => ({
    createdBy: one(users, {
      fields: [reviewStatuses.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [reviewStatuses.updatedBy],
      references: [users.id],
    }),
    reviews: many(reviews),
  }),
);
