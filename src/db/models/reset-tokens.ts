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

export const resetTokens = pgTable("reset_tokens", {
  id: serial().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id),
  token: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
  isUsed: boolean().notNull().default(false),
  usedAt: timestamp({ mode: "string" }),
  ipAddress: varchar({ length: 255 }).notNull(),
  userAgent: varchar({ length: 255 }).notNull(),
  deliveryMethod: varchar({ length: 30 }).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const resetTokensRelations = relations(resetTokens, ({ one }) => ({
  user: one(users, {
    fields: [resetTokens.userId],
    references: [users.id],
    relationName: "userResetTokens",
  }),
}));

// Insert schema with enhanced validation
export const insertResetTokensSchema = createInsertSchema(resetTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select schema
export const selectResetTokensSchema = createSelectSchema(resetTokens);

export default resetTokens;
