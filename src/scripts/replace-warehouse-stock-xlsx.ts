/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";
import { resolveWarehouseDatabaseUrl } from "./warehouse-db-url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "../..");

config({ path: resolve(backendRoot, ".env") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipImages = args.includes("--skip-images");
const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);

const databaseUrl = resolveWarehouseDatabaseUrl(args);
process.env.DATABASE_URL = databaseUrl;

const DEFAULT_USER_ID = 1;

async function assertDatabaseReachable() {
  const sql = postgres(databaseUrl, { connect_timeout: 15, max: 1 });
  try {
    await sql`select 1 as ok`;
    console.log(`Database reachable: ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function retireCatalogProducts() {
  const db = (await import("@/db")).default;
  const {
    directOrderProducts,
    dropshippingProducts,
    productCategories,
    productTags,
    products,
  } = await import("@/db/models");

  const timestamp = new Date().toISOString();

  console.log("Retiring existing catalog products (orders are left untouched)...");

  if (dryRun) {
    console.log("Dry run: would soft-delete products and clear direct/dropshipping links.");
    return;
  }

  await db.transaction(async (tx) => {
    const removedDirect = await tx
      .delete(directOrderProducts)
      .returning({ id: directOrderProducts.id });
    const removedDropship = await tx
      .delete(dropshippingProducts)
      .returning({ id: dropshippingProducts.id });
    await tx.delete(productCategories);
    await tx.delete(productTags);

    // Variant codes are globally unique. Hard deletes fail when group requests still
    // reference a variant, so retire codes instead of deleting rows tied to orders.
    const retiredVariants = await tx.execute(sql`
      UPDATE variants v
      SET
        variant_code = left(v.variant_code, 72) || '__r' || v.id::text,
        is_deleted = true,
        deleted_at = ${timestamp},
        deleted_by = ${DEFAULT_USER_ID},
        updated_at = ${timestamp},
        updated_by = ${DEFAULT_USER_ID}
      WHERE NOT EXISTS (
        SELECT 1 FROM order_items oi WHERE oi.variant_id = v.id
      )
      RETURNING v.id
    `);

    const retiredProducts = await tx
      .update(products)
      .set({
        isDeleted: true,
        deletedAt: timestamp,
        deletedBy: DEFAULT_USER_ID,
        updatedAt: timestamp,
        updatedBy: DEFAULT_USER_ID,
        imageUrls: [],
      })
      .returning({ id: products.id });

    console.log(`Removed ${removedDirect.length} direct-order links.`);
    console.log(`Removed ${removedDropship.length} dropshipping links.`);
    const variantCount = Array.isArray(retiredVariants)
      ? retiredVariants.length
      : 0;
    console.log(
      `Retired ${variantCount} variant codes (order-linked variants kept as-is).`,
    );
    console.log(`Retired ${retiredProducts.length} products.`);
  });

  console.log("Catalog retired. Import will create fresh product rows and codes.");
}

function runStep(label: string, scriptName: string, extraArgs: string[]) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(
    "tsx",
    [resolve(scriptDir, scriptName), "--file", xlsxPath, ...extraArgs],
    {
      cwd: backendRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

async function main() {
  console.log("replace-warehouse-stock-xlsx v2 (variant code retire, not delete)");
  console.log(`Workbook: ${xlsxPath}`);
  await assertDatabaseReachable();
  await retireCatalogProducts();

  const sharedArgs = dryRun ? ["--dry-run", "--force"] : ["--force"];
  runStep("Import warehouse products", "import-warehouse-stock-xlsx.ts", sharedArgs);

  if (!skipImages && !dryRun) {
    runStep("Upload embedded product images", "import-warehouse-product-images.ts", sharedArgs);
  }

  console.log("\nReplace import complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOTFOUND") {
      console.error(
        "\nThe database host in .env only resolves inside the Dokploy Docker network.\n"
        + "Run the same command in the Edoshop backend container terminal, or set DB_CONNECT_HOST=127.0.0.1\n"
        + "if you have an SSH tunnel to production Postgres on localhost.\n",
      );
    }
    console.error(error);
    process.exit(1);
  });
