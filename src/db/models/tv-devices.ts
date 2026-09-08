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
import { tvDeviceRefreshTokens } from "./tv-device-refresh-tokens";

export const tvDevices = pgTable("tv_devices", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  deviceKey: varchar("device_key", { length: 128 }).notNull().unique(),
  secretHash: varchar("secret_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { mode: "string" }),
  registeredAt: timestamp("registered_at", { mode: "string" }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  updatedBy: integer("updated_by")
    .references(() => users.id)
    .notNull(),
});

export const tvDevicesSchema = createSelectSchema(tvDevices);
export type TvDevice = z.infer<typeof tvDevicesSchema>;
export const insertTvDevicesSchema = createInsertSchema(tvDevices);
export type NewTvDevice = z.infer<typeof insertTvDevicesSchema>;

export const tvDevicesRelations = relations(tvDevices, ({ one, many }) => ({
  createdBy: one(users, { fields: [tvDevices.createdBy], references: [users.id] }),
  updatedBy: one(users, { fields: [tvDevices.updatedBy], references: [users.id] }),
  refreshTokens: many(tvDeviceRefreshTokens),
}));

export default tvDevices;
