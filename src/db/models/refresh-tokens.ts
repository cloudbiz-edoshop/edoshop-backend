import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id),
  tokenVersion: integer().notNull(),
  isRevoked: boolean().notNull().default(false),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).defaultNow(),
  expiresAt: timestamp({ mode: "string" }).notNull(),
});

// Relations
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
    relationName: "userRefreshTokens",
  }),
}));

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

export default refreshTokens;
