import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { constraintAndMessages } from "@/constants";

import permissions from "./permissions";
import { users } from "./users";

export const roles = pgTable("roles", {
  id: serial().primaryKey(),
  name: varchar({ length: constraintAndMessages.NAME.MAX_LENGTH })
    .notNull()
    .unique(),
  description: varchar({
    length: constraintAndMessages.DESCRIPTION.MAX_LENGTH,
  }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
});

export const rolesRelations = relations(roles, ({ one, many }) => ({
  permissions: many(permissions),
  createdByUser: one(users, {
    fields: [roles.createdBy],
    references: [users.id],
    relationName: "createdByUser",
  }),
  updatedByUser: one(users, {
    fields: [roles.updatedBy],
    references: [users.id],
    relationName: "updatedByUser",
  }),
}));

export default roles;
