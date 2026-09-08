import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const tvAds = pgTable("tv_ads", {
  id: serial().primaryKey(),
  title: varchar({ length: 255 }).notNull(),
  subtitle: text(),
  mediaType: varchar("media_type", { length: 16 }).notNull().default("image"),
  mediaUrl: varchar("media_url", { length: 512 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  displayDurationMs: integer("display_duration_ms").notNull().default(8000),
  isPermanent: boolean("is_permanent").notNull().default(false),
  startsAt: timestamp("starts_at", { mode: "string" }),
  endsAt: timestamp("ends_at", { mode: "string" }),
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

export const tvAdsSchema = createSelectSchema(tvAds);
export type TvAd = z.infer<typeof tvAdsSchema>;
export const insertTvAdsSchema = createInsertSchema(tvAds);
export type NewTvAd = z.infer<typeof insertTvAdsSchema>;

export const tvAdsRelations = relations(tvAds, ({ one }) => ({
  createdBy: one(users, { fields: [tvAds.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [tvAds.updatedBy], references: [users.id] }),
}));

export default tvAds;
