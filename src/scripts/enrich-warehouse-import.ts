/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as XLSX from "xlsx";

import {
  createVariantsForProduct,
  isValidLegacyReference,
  loadDirectOrderProductIdsByCode,
  normalizeLegacyReference,
  normalizeText,
  parseSizeLabels,
  translateCategoryName,
  truncate,
  updateImportedProductMetadata,
  WAREHOUSE_SHEETS,
  type WarehouseRow,
} from "./warehouse-import-utils";

const defaultXlsxPath = "/Users/mc/Downloads/Stock Disponible Warehouse 1.xlsx";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArgIndex = args.findIndex((arg) => arg === "--file");
const xlsxPath = fileArgIndex >= 0 ? resolve(args[fileArgIndex + 1] || "") : defaultXlsxPath;

const parseWorkbookRows = (): Map<string, WarehouseRow> => {
  const workbook = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
  const rowsByReference = new Map<string, WarehouseRow>();

  for (const sheetConfig of WAREHOUSE_SHEETS) {
    const sheet = workbook.Sheets[sheetConfig.sheetName];
    if (!sheet) {
      console.warn(`Sheet not found: ${sheetConfig.sheetName}`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
    });

    for (let index = 5; index < rows.length; index += 1) {
      const row = rows[index] || [];
      const legacyReference = normalizeLegacyReference(normalizeText(row[2]));
      if (!isValidLegacyReference(legacyReference)) continue;

      const categoryName = normalizeText(row[3]) || "Warehouse Import";
      const categoryNameEn = translateCategoryName(categoryName);
      const description = normalizeText(row[4]);
      const rawColor = normalizeText(row[5]);
      const rawSize = normalizeText(row[6]);
      const sizeLabels = parseSizeLabels(rawSize);

      rowsByReference.set(legacyReference, {
        warehouse: sheetConfig.warehouse,
        origin: sheetConfig.origin,
        seriesId: sheetConfig.seriesId,
        sheetName: sheetConfig.sheetName,
        legacyReference,
        categoryName,
        categoryNameEn,
        name: truncate(description || categoryNameEn || legacyReference, 255),
        description,
        color: rawColor,
        colorLabel: rawColor,
        sizeLabel: rawSize,
        sizeLabels,
        quantity: normalizeText(row[7]),
        unitPrice: normalizeText(row[8]),
        totalPrice: normalizeText(row[9]),
        binLocation: normalizeText(row[10]),
        comment: normalizeText(row[11]),
      });
    }
  }

  return rowsByReference;
};

async function main() {
  console.log(`Reading workbook: ${xlsxPath}`);
  const rowsByReference = parseWorkbookRows();
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
