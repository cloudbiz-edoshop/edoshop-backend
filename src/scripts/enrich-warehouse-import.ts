/* eslint-disable no-console */
import { resolve } from "node:path";

import {
  createVariantsForProduct,
  loadDirectOrderProductIdsByCode,
  loadWorkbookRowsByReference,
  updateImportedProductMetadata,
} from "./warehouse-import-utils";

const defaultXlsxPath = "/Users/mc/Downloads/Stock Disponible Warehouse 1.xlsx";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArgIndex = args.findIndex((arg) => arg === "--file");
const xlsxPath = fileArgIndex >= 0 ? resolve(args[fileArgIndex + 1] || "") : defaultXlsxPath;

async function main() {
  console.log(`Reading workbook: ${xlsxPath}`);
  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const productIdsByCode = await loadDirectOrderProductIdsByCode();
  const colorCache = new Map<string, number>();
  const sizeCache = new Map<string, number>();

  let updated = 0;
  let variantsCreated = 0;
  let missingInDb = 0;

  for (const [reference, row] of rowsByReference.entries()) {
    const productId = productIdsByCode.get(reference);
    if (!productId) {
      missingInDb += 1;
      continue;
    }

    await updateImportedProductMetadata({ productId, row, dryRun });
    await createVariantsForProduct({
      productId,
      directOrderCode: reference,
      row,
      dryRun,
      colorCache,
      sizeCache,
    });

    updated += 1;
    variantsCreated += row.sizeLabels.length;
  }

  console.log("\nEnrichment complete.");
  console.log(`${dryRun ? "Would update" : "Updated"} products: ${updated}`);
  console.log(`${dryRun ? "Would create up to" : "Processed"} variant rows: ${variantsCreated}`);
  console.log(`Spreadsheet rows missing in DB: ${missingInDb}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
