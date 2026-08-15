/* eslint-disable no-console */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { StoreIds } from "@/constants/stores.constants";
import db from "@/db";
import { directOrderProducts, productCategories, products, productTags } from "@/db/models";

import {
  buildSpecifications,
  createVariantsForProduct,
  ensureCategoryId,
  loadWorkbookRowsByReference,
  parsePrice,
  truncate,
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

const getExistingDirectOrderCodes = async () => {
  const rows = await db
    .select({
      directOrderCode: directOrderProducts.directOrderCode,
    })
    .from(directOrderProducts);

  return new Set(
    rows
      .map((row) => row.directOrderCode?.replace(/\s+/g, "").toUpperCase() || "")
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
  const rowsByReference = loadWorkbookRowsByReference(xlsxPath);
  const rows = [...rowsByReference.values()];
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
      const shortDescription = truncate(
        row.descriptionEn || row.description || row.categoryNameEn,
        500,
      );
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
          fullDescription: row.descriptionEn || row.description || shortDescription,
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
