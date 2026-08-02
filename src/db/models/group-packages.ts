import type { z } from "zod";

import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { packages } from "./packages";
import { users } from "./users";
import { warehouses } from "./warehouses";

export const groupPackages = pgTable("group_packages", {
  id: serial().primaryKey(),
  groupPackageCode: varchar({ length: 64 }).unique().notNull(),
  warehouseId: integer().notNull().references(() => warehouses.id),
  destinationArea: varchar({ length: 255 }).notNull(),
  status: varchar({ length: 32 }).notNull().default("Active"),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().notNull().references(() => users.id),
  updatedBy: integer().notNull().references(() => users.id),
});

export const groupPackageMembers = pgTable("group_package_members", {
  id: serial().primaryKey(),
  groupPackageId: integer().notNull().references(() => groupPackages.id, { onDelete: "cascade" }),
  packageId: integer().references(() => packages.id),
  childGroupPackageId: integer().references(() => groupPackages.id),
  addedAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  addedBy: integer().notNull().references(() => users.id),
  removedAt: timestamp({ mode: "string" }),
  removedBy: integer().references(() => users.id),
});

export const groupPackageEvents = pgTable("group_package_events", {
  id: serial().primaryKey(),
  groupPackageId: integer().notNull().references(() => groupPackages.id, { onDelete: "cascade" }),
  action: varchar({ length: 64 }).notNull(),
  details: text(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
  createdBy: integer().notNull().references(() => users.id),
});

export const groupPackagesSchema = createSelectSchema(groupPackages);
export type GroupPackages = z.infer<typeof groupPackagesSchema>;
export const insertGroupPackagesSchema = createInsertSchema(groupPackages);
export type NewGroupPackages = z.infer<typeof insertGroupPackagesSchema>;

export const groupPackagesRelations = relations(groupPackages, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [groupPackages.warehouseId],
    references: [warehouses.id],
  }),
  createdByUser: one(users, {
    fields: [groupPackages.createdBy],
    references: [users.id],
    relationName: "groupPackageCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [groupPackages.updatedBy],
    references: [users.id],
    relationName: "groupPackageUpdatedBy",
  }),
  members: many(groupPackageMembers, { relationName: "groupPackageMembers" }),
  nestedMembers: many(groupPackageMembers, { relationName: "nestedGroupMembers" }),
  events: many(groupPackageEvents),
}));

export const groupPackageMembersRelations = relations(groupPackageMembers, ({ one }) => ({
  groupPackage: one(groupPackages, {
    fields: [groupPackageMembers.groupPackageId],
    references: [groupPackages.id],
    relationName: "groupPackageMembers",
  }),
  package: one(packages, {
    fields: [groupPackageMembers.packageId],
    references: [packages.id],
  }),
  childGroupPackage: one(groupPackages, {
    fields: [groupPackageMembers.childGroupPackageId],
    references: [groupPackages.id],
    relationName: "nestedGroupMembers",
  }),
  addedByUser: one(users, {
    fields: [groupPackageMembers.addedBy],
    references: [users.id],
    relationName: "groupPackageMemberAddedBy",
  }),
  removedByUser: one(users, {
    fields: [groupPackageMembers.removedBy],
    references: [users.id],
    relationName: "groupPackageMemberRemovedBy",
  }),
}));

export const groupPackageEventsRelations = relations(groupPackageEvents, ({ one }) => ({
  groupPackage: one(groupPackages, {
    fields: [groupPackageEvents.groupPackageId],
    references: [groupPackages.id],
  }),
  createdByUser: one(users, {
    fields: [groupPackageEvents.createdBy],
    references: [users.id],
    relationName: "groupPackageEventCreatedBy",
  }),
}));

export default groupPackages;
