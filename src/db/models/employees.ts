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
import { createSelectSchema } from "drizzle-zod";

import roles from "./roles";
import users from "./users";

export const employees = pgTable("employees", {
  id: serial().primaryKey(),
  userId: integer()
    .references(() => users.id)
    .unique()
    .notNull(),
  roleId: integer().references(() => roles.id),
  roleExpiresAt: timestamp({ mode: "string" }),
  employeeCode: varchar({ length: 255 }).unique().notNull(),
  isActive: boolean().notNull().default(true),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  updatedBy: integer()
    .references(() => users.id)
    .notNull(),
  deletedBy: integer().references(() => users.id),
  deletedAt: timestamp({ mode: "string" }),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  isDeleted: boolean().notNull().default(false),
});

// Employee relations
export const employeesRelations = relations(employees, ({ one }) => ({
  // One-to-one relation with user
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  // Relation to user who created this employee
  createdByUser: one(users, {
    fields: [employees.createdBy],
    references: [users.id],
    relationName: "employeeCreatedBy",
  }),
  // Relation to user who last modified this employee
  updatedByUser: one(users, {
    fields: [employees.updatedBy],
    references: [users.id],
    relationName: "employeeModifiedBy",
  }),
  // Relation to user who deleted this employee
  deletedByUser: one(users, {
    fields: [employees.deletedBy],
    references: [users.id],
    relationName: "employeeDeletedBy",
  }),
  // Relation to role
  role: one(roles, {
    fields: [employees.roleId],
    references: [roles.id],
  }),
}));

export const employeeSchema = createSelectSchema(employees);

export type Employee = z.infer<typeof employeeSchema>;

export default employees;
