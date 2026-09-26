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

export type PromoBannerCard = {
  mediaType: "image" | "video";
  cardFormat?: "square" | "rectangle";
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  ctaLabel?: string;
};
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const promoBanners = pgTable("promo_banners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  text: varchar("text", { length: 255 }).notNull().default(""),
  cards: jsonb("cards").$type<PromoBannerCard[]>().notNull().default([]),
  backgroundColor: varchar("background_color", { length: 16 })
    .notNull()
    .default("yellow"),
  textColor: varchar("text_color", { length: 16 }).notNull().default("#1a1a1a"),
  fontSizePx: integer("font_size_px").notNull().default(13),
  textAnimation: varchar("text_animation", { length: 16 })
    .notNull()
    .default("fixed"),
  isActive: boolean("is_active").notNull().default(false),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  displayDurationHours: integer("display_duration_hours"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const promoBannersRelations = relations(promoBanners, ({ one }) => ({
  createdByUser: one(users, {
    fields: [promoBanners.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [promoBanners.updatedBy],
    references: [users.id],
  }),
}));

export const promoBannersSchema = createSelectSchema(promoBanners);
export const insertPromoBannerSchema = createInsertSchema(promoBanners);
export type PromoBanner = typeof promoBanners.$inferSelect;
export type NewPromoBanner = typeof promoBanners.$inferInsert;

export default promoBanners;
