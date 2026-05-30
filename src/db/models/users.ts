import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { constraintAndMessages } from "@/constants";

import addresses from "./addresses";
import customers from "./customers";
import employees from "./employees";
import { refreshTokens } from "./refresh-tokens";
import { resetTokens } from "./reset-tokens";
import suppliers from "./suppliers";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  username: varchar({ length: constraintAndMessages.USERNAME.MAX_LENGTH })
    .notNull()
    .unique(),
  isAdmin: boolean().notNull().default(false),
  email: varchar({ length: constraintAndMessages.EMAIL.MAX_LENGTH }).unique(),
  password: varchar({
    length: 255,
  }), // null for external users (suppliers)
  fullName: varchar({
    length: constraintAndMessages.FULL_NAME.MAX_LENGTH,
  }).notNull(),
  phoneNumber: varchar({
    length: constraintAndMessages.PHONE.MAX_LENGTH,
  }).unique(),
  profilePhotoUrl: varchar({
    length: constraintAndMessages.PROFILE_PHOTO_URL.MAX_LENGTH,
  }),
  isActive: boolean().notNull().default(true),
  isEmailVerified: boolean().notNull().default(false),
  isPhoneNumberVerified: boolean().notNull().default(false),
  createdBy: integer(),
  updatedBy: integer(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp({ mode: "string" }),
  isDeleted: boolean().notNull().default(false),
  deletedBy: integer(),
  failedLoginAttempts: integer().default(0).notNull(),
  lastFailedLoginAt: timestamp({ mode: "string" }),
  lockedUntil: timestamp({ mode: "string" }),
});

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  // One-to-one relation with employee
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
    relationName: "userEmployee",
  }),
  // Self-reference for tracking who created this user
  createdByUser: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "userCreatedBy",
  }),
  // Self-reference for tracking who last modified this user
  updatedByUser: one(users, {
    fields: [users.updatedBy],
    references: [users.id],
    relationName: "userUpdatedBy",
  }),
  // Self-reference for tracking who deleted this user
  deletedByUser: one(users, {
    fields: [users.deletedBy],
    references: [users.id],
    relationName: "userDeletedBy",
  }),
  // Users created by this user
  createdUsers: many(users, { relationName: "userCreatedBy" }),
  // Users modified by this user
  modifiedUsers: many(users, { relationName: "userUpdatedBy" }),
  // Users deleted by this user
  deletedUsers: many(users, { relationName: "userDeletedBy" }),
  // Employees created by this user
  createdEmployees: many(employees, { relationName: "employeeCreatedBy" }),
  // Employees modified by this user
  modifiedEmployees: many(employees, { relationName: "employeeModifiedBy" }),
  // Employees deleted by this user
  deletedEmployees: many(employees, { relationName: "employeeDeletedBy" }),
  // Supplier associated with this user
  supplier: one(suppliers, {
    fields: [users.id],
    references: [suppliers.userId],
  }),
  // Customer associated with this user
  customer: one(customers, {
    fields: [users.id],
    references: [customers.userId],
  }),
  // Suppliers created by this user
  createdSuppliers: many(suppliers, { relationName: "supplierCreatedBy" }),
  // Suppliers modified by this user
  modifiedSuppliers: many(suppliers, { relationName: "supplierModifiedBy" }),
  // Suppliers deleted by this user
  deletedSuppliers: many(suppliers, { relationName: "supplierDeletedBy" }),
  // Reset tokens for this user
  resetTokens: many(resetTokens, { relationName: "userResetTokens" }),
  // Refresh tokens for this user
  refreshTokens: many(refreshTokens, { relationName: "userRefreshTokens" }),
  // Addresses for this user
  addresses: many(addresses, { relationName: "userAddresses" }),
}));

export default users;
