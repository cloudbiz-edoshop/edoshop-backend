import config from "$/drizzle.config";
import { sql } from "drizzle-orm";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "@/config";
import db from "@/db";
import nextBundleCode from "@/db/functions/next-bundle-code";
import nextCustomerCode from "@/db/functions/next-customer-code";
import nextDirectOrderProductCode from "@/db/functions/next-direct-order-product-code";
import nextDirectOrderVariantCode from "@/db/functions/next-direct-order-variant-code";
import nextDropshippingProductCode from "@/db/functions/next-dropshipping-product-code";
import nextDropshippingVariantCode from "@/db/functions/next-dropshipping-variant-code";
import nextItemCode from "@/db/functions/next-item-code";
import nextPackageCode from "@/db/functions/next-package-code";
import nextRetailerCode from "@/db/functions/next-retailer-code";
import nextSeriesCode from "@/db/functions/next-series-code";
import nextSupplierCode from "@/db/functions/next-supplier-code";
import { nextWarehouseTransferCode } from "./functions/next-warehouse-transfer-code";

if (!env.DB_MIGRATING) {
  throw new Error("You must set DB_MIGRATING to true when running migrations");
}

await migrate(db, {
  migrationsFolder: config.out!,
  migrationsSchema: config.migrations!.schema,
});

await db.execute(sql.raw(nextSupplierCode));
await db.execute(sql.raw(nextCustomerCode));
await db.execute(sql.raw(nextRetailerCode));
await db.execute(sql.raw(nextBundleCode));
await db.execute(sql.raw(nextSeriesCode));
await db.execute(sql.raw(nextItemCode));
await db.execute(sql.raw(nextPackageCode));
await db.execute(sql.raw(nextDirectOrderProductCode));
await db.execute(sql.raw(nextDropshippingProductCode));
await db.execute(sql.raw(nextDirectOrderVariantCode));
await db.execute(sql.raw(nextDropshippingVariantCode));
await db.execute(sql.raw(nextWarehouseTransferCode));

await db.$client.end();
