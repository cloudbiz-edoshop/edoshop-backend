/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
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
    variants,
  } = await import("@/db/models");

  const timestamp = new Date().toISOString();

  console.log("Retiring existing catalog products (orders are left untouched)...");

  if (dryRun) {
    console.log("Dry run: would soft-delete products and clear direct/dropshipping links.");
    return;
  }

  await db
    .update(variants)
    .set({
      isDeleted: true,
      deletedAt: timestamp,
      deletedBy: DEFAULT_USER_ID,
      updatedAt: timestamp,
      updatedBy: DEFAULT_USER_ID,
    });

  await db.delete(productCategories);
  await db.delete(productTags);
  await db.delete(directOrderProducts);
  await db.delete(dropshippingProducts);

  await db
    .update(products)
    .set({
      isDeleted: true,
      deletedAt: timestamp,
      deletedBy: DEFAULT_USER_ID,
      updatedAt: timestamp,
      updatedBy: DEFAULT_USER_ID,
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
  console.log(`Workbook: ${xlsxPath}`);
  await assertDatabaseReachable();
  await retireCatalogProducts();

  const sharedArgs = dryRun ? ["--dry-run"] : [];
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
