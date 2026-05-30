/* eslint-disable no-console */
import type { Table } from "drizzle-orm";

import type { Database } from "@/db";

import { getTableName, sql } from "drizzle-orm";

import { env } from "@/config";
import db from "@/db";
import { allTables } from "@/db/tables";

import { resetAllSequences } from "./reset-sequences";
import * as seeds from "./seeds";

if (!env.DB_SEEDING) {
  throw new Error("You must set DB_SEEDING to true when running seeds");
}

async function resetTable(db: Database, table: Table) {
  const tableName = getTableName(table);
  // Quote table name if it contains special characters (like hyphens)
  const quotedTableName = tableName.includes("-") ? `"${tableName}"` : tableName;

  return db.execute(
    sql.raw(`TRUNCATE TABLE ${quotedTableName} RESTART IDENTITY CASCADE`),
  );
}

async function setTimeZone(db: Database) {
  // set time to karachi
  return db.execute(sql.raw(`SET timezone = 'Asia/Karachi';`));
}

await setTimeZone(db);

for (const table of allTables) {
  await resetTable(db, table);
}

await seeds.countries(db);
console.log("\n--- Countries seeded ---\n");

await seeds.cities(db);
console.log("\n--- Cities seeded ---\n");

await seeds.entities(db);
console.log("\n--- Entities seeded ---\n");

await seeds.operations(db);
console.log("\n--- Operations seeded ---\n");

await seeds.users(db);
console.log("\n--- Users seeded ---\n");

await seeds.roles(db);
console.log("\n--- Roles seeded ---\n");

await seeds.permissions(db);
console.log("\n--- Permissions seeded ---\n");

await seeds.employees(db);
console.log("\n--- Employees seeded ---\n");

await seeds.drivers(db);
console.log("\n--- Drivers seeded ---\n");

await seeds.addressTypes(db);
console.log("\n--- Address Types seeded ---\n");

await seeds.addresses(db);
console.log("\n--- Addresses seeded ---\n");

await seeds.stores(db);
console.log("\n--- Stores seeded ---\n");

await seeds.warehouses(db);
console.log("\n--- Warehouses seeded ---\n");

await seeds.categories(db);
console.log("\n--- Categories seeded ---\n");

await seeds.colors(db);
console.log("\n--- Colors seeded ---\n");

await seeds.sizes(db);
console.log("\n--- Sizes seeded ---\n");

await seeds.paymentTypes(db);
console.log("\n--- Payment Types seeded ---\n");

await seeds.paymentMethods(db);
console.log("\n--- Payment Methods seeded ---\n");

await seeds.paymentMethodTypes(db);
console.log("\n--- Payment Method Types seeded ---\n");

await seeds.customers(db);
console.log("\n--- Customers seeded ---\n");

await seeds.entryStates(db);
console.log("\n--- Entry States seeded ---\n");

await seeds.entryTypes(db);
console.log("\n--- Entry Types seeded ---\n");

await seeds.suppliers(db);
console.log("\n--- Suppliers seeded ---\n");

await seeds.entries(db);
console.log("\n--- Entries seeded ---\n");

await seeds.bundles(db);
console.log("\n--- Bundles seeded ---\n");

await seeds.series(db);
console.log("\n--- Series seeded ---\n");

await seeds.items(db);
console.log("\n--- Items seeded ---\n");

await seeds.packageStatuses(db);
console.log("\n--- package statuses seeded ---\n");

await seeds.packages(db);
console.log("\n--- Packages seeded ---\n");

await seeds.returns(db);
console.log("\n--- Returns seeded ---\n");

await seeds.materialTypes(db);
console.log("\n--- Material Types seeded ---\n");

await seeds.designPatterns(db);
console.log("\n--- Design Patterns seeded ---\n");

await seeds.notificationTypes(db);
console.log("\n--- Notification Types seeded ---\n");

await seeds.recipientTypes(db);
console.log("\n--- Recipient Types seeded ---\n");

await seeds.notificationFrequencies(db);
console.log("\n--- Notification Frequencies seeded ---\n");

await seeds.tags(db);
console.log("\n--- Tags seeded ---\n");

await seeds.groupCriteriaTypes(db);
console.log("\n--- Group Criteria Types seeded ---\n");

await seeds.products(db);
console.log("\n--- Products seeded ---\n");

await seeds.product_categories(db);
console.log("\n--- Product Categories seeded ---\n");

await seeds.product_tags(db);
console.log("\n--- Product Tags seeded ---\n");

await seeds.reviewStatuses(db);
console.log("\n--- Review Statuses seeded ---\n");

await seeds.variants(db);
console.log("\n--- Variants seeded ---\n");

await seeds.discountTypes(db);
console.log("\n--- Discount Types seeded ---\n");

await seeds.groupApprovalStatuses(db);
console.log("\n--- Group Approval statuses seeded ---\n");

await seeds.ongoingGroups(db);
console.log("\n--- Ongoing Groups seeded ---\n");

await seeds.transferStatuses(db);
console.log("\n--- Transfer Statuses seeded ---\n");

await seeds.testimonials(db);
console.log("\n--- Testimonials seeded ---\n");

await seeds.fulfillmentStates(db);
console.log("\n--- fulfillment States seeded ---\n");

await seeds.orderFulfillmentStatuses(db);
console.log("\n--- Order Fulfillment Statuses seeded ---\n");

await seeds.orderItemFulfillmentStatuses(db);
console.log("\n--- Order Item Fulfillment Statuses seeded ---\n");

await seeds.orderStatuses(db);
console.log("\n--- Order Statuses seeded ---\n");

await seeds.orderTypes(db);
console.log("\n--- Order Types seeded ---\n");

await seeds.shippingPriorityCodes(db);
console.log("\n--- Shipping Priority Codes seeded ---\n");

await seeds.shippingTypes(db);
console.log("\n--- Shipping Types seeded ---\n");

await seeds.orders(db);
console.log("\n--- Orders seeded ---\n");

await seeds.orderItems(db);
console.log("\n--- Order Items seeded ---\n");

await seeds.packageItems(db);
console.log("\n--- Package Items seeded ---\n");

await seeds.shippingLabels(db);
console.log("\n--- Shipping Labels seeded ---\n");

await seeds.paymentStatuses(db);
console.log("\n--- Payment Statuses seeded ---\n");

await seeds.paymentTransactions(db);
console.log("\n--- Payment Transactions seeded ---\n");

await seeds.warehouseTransfers(db);
console.log("\n--- warehouse Transfers seeded ---\n");

await seeds.warehouseTransfersHistory(db);
console.log("\n--- warehouse Transfers History seeded ---\n");

await seeds.rayons(db);
console.log("\n--- Rayons seeded ---\n");

await seeds.shelves(db);
console.log("\n--- Shelves seeded ---\n");

await seeds.bins(db);
console.log("\n--- Bins seeded ---\n");

await seeds.storage(db);
console.log("\n--- Storage seeded ---\n");

// Reset all sequences after seeding to ensure new records get proper IDs
await resetAllSequences(db);

await db.$client.end();
