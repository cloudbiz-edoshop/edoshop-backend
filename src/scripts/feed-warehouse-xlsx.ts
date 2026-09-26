/* eslint-disable no-console */
import "dotenv/config";

/**
 * Fast warehouse spreadsheet feed:
 * 1) import products that are not in DB yet
 * 2) upload embedded photos only for products still missing images
 *
 * Usage:
 *   npm run products:feed-warehouse-xlsx -- --local
 *   npm run products:feed-warehouse-xlsx -- --prod
 *   npm run products:feed-warehouse-xlsx -- --local --prod
 *   npm run products:feed-warehouse-xlsx -- --prod --file /app/data/imports/warehouse-stock.xlsx
 *
 * Bin placements for EWMS visualization (spreadsheet column 10):
 *   npm run products:sync-warehouse-xlsx-bins -- --prod --file ...
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";

const scriptDir = resolve(fileURLToPath(import.meta.url), "..");
const backendRoot = resolve(scriptDir, "../..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const runLocal = args.includes("--local");
const runProd = args.includes("--prod") || !runLocal;
const skipBins = args.includes("--skip-bins");

const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);
console.log(`Using spreadsheet: ${xlsxPath}`);

const localDatabaseUrl =
  process.env.LOCAL_DATABASE_URL || "postgresql://mc@localhost:5432/edoshop";

const runStep = (
  label: string,
  scriptName: string,
  extraArgs: string[],
  env: NodeJS.ProcessEnv,
) => {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(
    "tsx",
    [resolve(scriptDir, scriptName), "--file", xlsxPath, ...extraArgs],
    { cwd: backendRoot, env, stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
};

async function main() {
  const sharedArgs = dryRun ? ["--dry-run"] : [];

  const targets: Array<{ name: string; url: string }> = [];
  if (runLocal) targets.push({ name: "LOCAL", url: localDatabaseUrl });
  if (runProd) {
    const prodUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
    if (!prodUrl) throw new Error("Set PROD_DATABASE_URL or DATABASE_URL for --prod");
    targets.push({ name: "PROD", url: prodUrl });
  }

  for (const target of targets) {
    const env = { ...process.env, DATABASE_URL: target.url };
    console.log(`\n######## ${target.name} ########`);
    console.log(`DB: ${target.url.replace(/:[^:@/]+@/, ":***@")}`);

    runStep(
      `${target.name}: import missing products`,
      "import-warehouse-stock-xlsx.ts",
      sharedArgs,
      env,
    );
    runStep(
      `${target.name}: upload missing images`,
      "import-warehouse-product-images.ts",
      sharedArgs,
      env,
    );

    if (!skipBins) {
      const targetFlag = target.name === "LOCAL" ? "--local" : "--prod";
      const provisionArgs = [...sharedArgs, targetFlag];
      runStep(
        `${target.name}: provision EWMS bins from sheet`,
        "provision-warehouse-bins-from-xlsx.ts",
        provisionArgs,
        env,
      );
      runStep(
        `${target.name}: provision EWMS item entries`,
        "provision-warehouse-item-entries-from-xlsx.ts",
        provisionArgs,
        env,
      );
      runStep(
        `${target.name}: sync EWMS bin locations`,
        "sync-warehouse-xlsx-bins.ts",
        [...provisionArgs, "--sync-quantity"],
        env,
      );
    }
  }

  console.log("\nDone. (Skipped full enrich — use products:enrich-warehouse-xlsx only if you need metadata refresh.)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
