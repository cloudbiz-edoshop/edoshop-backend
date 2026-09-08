import type { z } from "zod";

import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { tvDevices } from "./tv-devices";

export const tvDeviceRefreshTokens = pgTable("tv_device_refresh_tokens", {
  id: serial().primaryKey(),
  deviceId: integer("device_id")
    .references(() => tvDevices.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const tvDeviceRefreshTokensSchema = createSelectSchema(tvDeviceRefreshTokens);
export type TvDeviceRefreshToken = z.infer<typeof tvDeviceRefreshTokensSchema>;
export const insertTvDeviceRefreshTokensSchema = createInsertSchema(tvDeviceRefreshTokens);

export const tvDeviceRefreshTokensRelations = relations(
  tvDeviceRefreshTokens,
  ({ one }) => ({
    device: one(tvDevices, {
      fields: [tvDeviceRefreshTokens.deviceId],
      references: [tvDevices.id],
    }),
  }),
);

export default tvDeviceRefreshTokens;
