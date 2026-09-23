import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

export const storefrontBannerSettings = pgTable("storefront_banner_settings", {
  id: serial("id").primaryKey(),
  activeHomeBannerType: varchar("active_home_banner_type", { length: 16 })
    .notNull()
    .default("stylish"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export type StorefrontBannerSettings =
  typeof storefrontBannerSettings.$inferSelect;

export default storefrontBannerSettings;
