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

import { attributeTypes } from "./attribute-types";
import { users } from "./users";

const attributes = pgTable("attributes", {
  id: serial().primaryKey(),
  attributeTypeId: integer()
    .references(() => attributeTypes.id)
    .notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .notNull()
    .references(() => users.id),
  updatedBy: integer()
    .notNull()
    .references(() => users.id),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
  isDeleted: boolean().notNull().default(false),
});

const attributesRelations = relations(attributes, ({ one }) => ({
  attributeType: one(attributeTypes, {
    fields: [attributes.attributeTypeId],
    references: [attributeTypes.id],
  }),
  createdBy: one(users, {
    fields: [attributes.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [attributes.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [attributes.deletedBy],
    references: [users.id],
  }),
}));

/**
 * Attributes insert schema
 */
const insertAttributesSchema = createInsertSchema(attributes);

/**
 * Attributes select schema
 */
const selectAttributesSchema = createSelectSchema(attributes);

/**
 * New attributes type definition
 */
type NewAttributes = z.infer<typeof insertAttributesSchema>;

/**
 * Retailer type definition
 */
type Attributes = z.infer<typeof selectAttributesSchema>;

export default attributes;
export {
  attributes,
  attributesRelations,
  insertAttributesSchema,
  selectAttributesSchema,
};
export type { Attributes, NewAttributes };
