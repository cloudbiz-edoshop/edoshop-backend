import type { z } from "zod";

import { boolean, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

export const tvSettings = pgTable("tv_settings", {
  id: serial().primaryKey(),
  magazineVersion: integer("magazine_version").notNull().default(1),
  invitationTitle: varchar("invitation_title", { length: 255 })
    .notNull()
    .default("Download the EDOSHOP App"),
  iosUrl: varchar("ios_url", { length: 512 }),
  androidUrl: varchar("android_url", { length: 512 }),
  fallbackUrl: varchar("fallback_url", { length: 512 }),
  qrTargetUrl: varchar("qr_target_url", { length: 512 }),
  catalogMode: varchar("catalog_mode", { length: 32 }).notNull().default("all"),
  includeBanners: boolean("include_banners").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const tvSettingsSchema = createSelectSchema(tvSettings);
export type TvSettings = z.infer<typeof tvSettingsSchema>;
export const insertTvSettingsSchema = createInsertSchema(tvSettings);
export type NewTvSettings = z.infer<typeof insertTvSettingsSchema>;

export default tvSettings;
