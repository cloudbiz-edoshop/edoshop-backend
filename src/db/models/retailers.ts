import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { users } from "./users";

/**
 * Retailers table schema
 */
const retailers = pgTable("retailers", {
  id: serial().primaryKey(),
  userId: integer()
    .notNull()
    .unique()
    .references(() => users.id),
  shopName: text().notNull(),
  retailerCode: text().unique().notNull(),
  status: boolean().default(true).notNull(),
  isDeleted: boolean().default(false).notNull(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }),
  createdBy: integer()
    .notNull()
    .references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer("deleted_by").references(() => users.id),
});

/**
 * Retailers table relations
 */
const retailersRelations = relations(retailers, ({ one }) => ({
  user: one(users, {
    fields: [retailers.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [retailers.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [retailers.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [retailers.deletedBy],
    references: [users.id],
  }),
}));

/**
 * Retailer insert schema
 */
const insertRetailerSchema = createInsertSchema(retailers);

/**
 * Retailer select schema
 */
const selectRetailerSchema = createSelectSchema(retailers);

/**
 * New retailer type definition
 */
type NewRetailer = z.infer<typeof insertRetailerSchema>;

/**
 * Retailer type definition
 */
type Retailer = z.infer<typeof selectRetailerSchema>;

export default retailers;
export { insertRetailerSchema, retailersRelations, selectRetailerSchema };
export type { NewRetailer, Retailer };
