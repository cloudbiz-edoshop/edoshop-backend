import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { attributes } from "./attributes";
import { users } from "./users";

export const attributeTypes = pgTable("attribute_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull().unique(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});

export const attributeTypesSchema = createSelectSchema(attributeTypes);

export type AttributeTypes = z.infer<typeof attributeTypesSchema>;

export default attributeTypes;

export const attributeTypesRelations = relations(
  attributeTypes,
  ({ one, many }) => ({
    attributes: many(attributes),
    createdBy: one(users, {
      fields: [attributeTypes.createdBy],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [attributeTypes.updatedBy],
      references: [users.id],
    }),
  }),
);
