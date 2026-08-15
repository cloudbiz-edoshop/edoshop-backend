/* eslint-disable no-console */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import { StoreIds } from "@/constants/stores.constants";
import db from "@/db";
import { directOrderProducts, productCategories, products, productTags } from "@/db/models";

import {
  buildSpecifications,
  createVariantsForProduct,
  ensureCategoryId,
  isValidLegacyReference,
  normalizeLegacyReference,
  normalizeText,
  parsePrice,
  parseSizeLabels,
  translateCategoryName,
  truncate,
  WAREHOUSE_SHEETS,
  type WarehouseRow,
} from "./warehouse-import-utils";

const DEFAULT_TAG_ID = 1;
const DEFAULT_USER_ID = 1;
const CHUNK_SIZE = 50;

type IdMappingRow = {
  legacyReference: string;
  newProductId: number;
  directOrderCode: string;
  name: string;
  warehouse: string;
  origin: string;
  sheetName: string;
  imageFileHint: string;
};

const defaultXlsxPath = "/Users/mc/Downloads/Stock Disponible Warehouse 1.xlsx";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = resolve(scriptDir, "../../data/imports");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArgIndex = args.findIndex((arg) => arg === "--file");
const xlsxPath = fileArgIndex >= 0 ? resolve(args[fileArgIndex + 1] || "") : defaultXlsxPath;
const outputArgIndex = args.findIndex((arg) => arg === "--output");
const outputDir = outputArgIndex >= 0
  ? resolve(args[outputArgIndex + 1] || "")
  : defaultOutputDir;

const parseWorkbookRows = (): WarehouseRow[] => {
  const workbook = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
  const parsedRows: WarehouseRow[] = [];
  const seen = new Set<string>();

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
      if (seen.has(legacyReference)) continue;

      seen.add(legacyReference);
      const categoryName = normalizeText(row[3]) || "Warehouse Import";
      const categoryNameEn = translateCategoryName(categoryName);
      const description = normalizeText(row[4]);
      const rawColor = normalizeText(row[5]);
      const rawSize = normalizeText(row[6]);
      const colorLabel = rawColor;
      const sizeLabels = parseSizeLabels(rawSize);
      const name = truncate(description || categoryNameEn || legacyReference, 255);

      parsedRows.push({
        warehouse: sheetConfig.warehouse,
        origin: sheetConfig.origin,
        seriesId: sheetConfig.seriesId,
        sheetName: sheetConfig.sheetName,
        legacyReference,
        categoryName,
        categoryNameEn,
        name,
        description,
        color: rawColor,
        colorLabel,
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

  return parsedRows;
};

const getExistingDirectOrderCodes = async () => {
  const rows = await db
    .select({
      directOrderCode: directOrderProducts.directOrderCode,
    })
    .from(directOrderProducts);

  return new Set(
    rows
      .map((row) => normalizeLegacyReference(row.directOrderCode || ""))
      .filter(Boolean),
  );
};

const writeMappingFiles = (mapping: IdMappingRow[]) => {
  mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(outputDir, `warehouse-stock-id-mapping-${timestamp}.json`);
  const csvPath = resolve(outputDir, `warehouse-stock-id-mapping-${timestamp}.csv`);

  writeFileSync(jsonPath, JSON.stringify(mapping, null, 2), "utf8");

  const csvHeader = [
    "legacyReference",
    "newProductId",
    "directOrderCode",
    "name",
    "warehouse",
    "origin",
    "sheetName",
    "imageFileHint",
  ].join(",");

  const csvBody = mapping
    .map((row) => [
      row.legacyReference,
      row.newProductId,
      row.directOrderCode,
      `"${row.name.replace(/"/g, '""')}"`,
      row.warehouse,
      row.origin,
      row.sheetName,
      row.imageFileHint,
    ].join(","))
    .join("\n");

  writeFileSync(csvPath, `${csvHeader}\n${csvBody}\n`, "utf8");

  return { jsonPath, csvPath };
};

async function main() {
  console.log(`Reading workbook: ${xlsxPath}`);
  const rows = parseWorkbookRows();
  console.log(`Parsed ${rows.length} unique warehouse products.`);

  if (!rows.length) {
    console.log("No importable rows found.");
    process.exit(0);
  }

  const existingCodes = await getExistingDirectOrderCodes();
  const categoryCache = new Map<string, number>();
  const colorCache = new Map<string, number>();
  const sizeCache = new Map<string, number>();
  const mapping: IdMappingRow[] = [];
  const skippedExisting: string[] = [];

  const importRows = rows.filter((row) => {
    if (existingCodes.has(row.legacyReference)) {
      skippedExisting.push(row.legacyReference);
      return false;
    }
    return true;
  });

  console.log(`Skipping ${skippedExisting.length} products already in DB.`);
  console.log(`${dryRun ? "Dry run:" : "Importing"} ${importRows.length} products...`);

  for (let index = 0; index < importRows.length; index += CHUNK_SIZE) {
    const chunk = importRows.slice(index, index + CHUNK_SIZE);

    for (const row of chunk) {
      const categoryId = await ensureCategoryId(categoryCache, row.categoryName, dryRun);
      const directOrderCode = row.legacyReference;
      const price = parsePrice(row.unitPrice);
      const shortDescription = truncate(row.description || row.categoryNameEn, 500);
      const specifications = buildSpecifications(row);

      if (dryRun) {
        mapping.push({
          legacyReference: row.legacyReference,
          newProductId: mapping.length + 1,
          directOrderCode,
          name: row.name,
          warehouse: row.warehouse,
          origin: row.origin,
          sheetName: row.sheetName,
          imageFileHint: `${row.legacyReference}-1.jpg`,
        });
        continue;
      }

      const [product] = await db
        .insert(products)
        .values({
          storeId: StoreIds.direct,
          seriesId: row.seriesId,
          name: row.name,
          price,
          shortDescription,
          fullDescription: row.description || shortDescription,
          specifications,
          imageUrls: [],
          version: 1,
          createdBy: DEFAULT_USER_ID,
          updatedBy: DEFAULT_USER_ID,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning({ id: products.id });

      await db.insert(directOrderProducts).values({
        productId: product.id,
        seriesId: row.seriesId,
        directOrderCode,
        totalItems: Number.parseInt(row.quantity, 10) || null,
        createdAt: new Date().toISOString(),
        createdBy: DEFAULT_USER_ID,
      });

      await db.insert(productCategories).values({
        productId: product.id,
        categoryId,
        createdAt: new Date().toISOString(),
        createdBy: DEFAULT_USER_ID,
      });

      await db.insert(productTags).values({
        productId: product.id,
        tagId: DEFAULT_TAG_ID,
        createdAt: new Date().toISOString(),
        createdBy: DEFAULT_USER_ID,
      });

      await createVariantsForProduct({
        productId: product.id,
        directOrderCode,
        row,
        dryRun,
        colorCache,
        sizeCache,
      });

      mapping.push({
        legacyReference: row.legacyReference,
        newProductId: product.id,
        directOrderCode,
        name: row.name,
        warehouse: row.warehouse,
        origin: row.origin,
        sheetName: row.sheetName,
        imageFileHint: `${product.id}-1.jpg`,
      });
    }

    console.log(`Processed ${Math.min(index + CHUNK_SIZE, importRows.length)} / ${importRows.length}`);
  }

  const { jsonPath, csvPath } = writeMappingFiles(mapping);

  console.log("\nImport complete.");
  console.log(`Created: ${dryRun ? 0 : mapping.length}`);
  console.log(`Mapping JSON: ${jsonPath}`);
  console.log(`Mapping CSV:  ${csvPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
