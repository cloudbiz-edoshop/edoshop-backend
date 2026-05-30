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

export const materialTypes = pgTable("material_types", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).unique().notNull(),
  description: varchar({ length: 255 }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  isDeleted: boolean().notNull().default(false),
  deletedAt: timestamp({ mode: "string" }),
  deletedBy: integer().references(() => users.id),
});

export const materialTypesSchema = createSelectSchema(materialTypes);

export type MaterialTypes = z.infer<typeof materialTypesSchema>;

export const insertMaterialTypesSchema = createInsertSchema(materialTypes);

export type NewMaterialTypes = z.infer<typeof insertMaterialTypesSchema>;

export default materialTypes;

export const materialTypesRelations = relations(materialTypes, ({ one }) => ({
  createdBy: one(users, {
    fields: [materialTypes.createdBy],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [materialTypes.updatedBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [materialTypes.deletedBy],
    references: [users.id],
  }),
}));
