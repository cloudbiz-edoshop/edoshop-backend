/* eslint-disable no-console */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

import { StoreIds } from "@/constants/stores.constants";
import db from "@/db";
import {
  categories,
  directOrderProducts,
  productCategories,
  products,
  productTags,
} from "@/db/models";

const DEFAULT_TAG_ID = 1;
const DEFAULT_USER_ID = 1;
const CHUNK_SIZE = 50;

const WAREHOUSE_SHEETS = [
  { sheetName: "Stock Entree TR", warehouse: "TR", seriesId: 1 },
  { sheetName: "Stock Entree Chine", warehouse: "CN", seriesId: 6 },
  { sheetName: "Stock Entree USA", warehouse: "US", seriesId: 7 },
] as const;

type WarehouseRow = {
  warehouse: string;
  seriesId: number;
  sheetName: string;
  legacyReference: string;
  categoryName: string;
  name: string;
  description: string;
  color: string;
  sizeLabel: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  binLocation: string;
  comment: string;
};

type IdMappingRow = {
  legacyReference: string;
  newProductId: number;
  directOrderCode: string;
  name: string;
  warehouse: string;
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

const normalizeText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalizeLegacyReference = (value: string) => value.replace(/\s+/g, "").toUpperCase();

const isValidLegacyReference = (value: string) => {
  const normalized = normalizeLegacyReference(value);
  if (!normalized) return false;
  if (normalized.toLowerCase().includes("nonmention")) return false;
  if (normalized.toLowerCase().includes("non mention")) return false;
  return /^DO[-_A-Z0-9]+$/i.test(normalized);
};

const parsePrice = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return "0.00";
  return parsed.toFixed(2);
};

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};

const buildSpecifications = (row: WarehouseRow) => [
  `Legacy Reference: ${row.legacyReference}`,
  `Warehouse: ${row.warehouse}`,
  `Category: ${row.categoryName}`,
  row.color ? `Color: ${row.color}` : null,
  row.sizeLabel ? `Size: ${row.sizeLabel}` : null,
  row.quantity ? `Quantity: ${row.quantity}` : null,
  row.binLocation ? `Bin Location: ${row.binLocation}` : null,
  row.comment ? `Comment: ${row.comment}` : null,
  `Suggested image filename prefix: ${row.legacyReference}`,
].filter(Boolean).join("\n");

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
      const description = normalizeText(row[4]);
      const categoryName = normalizeText(row[3]) || "Warehouse Import";
      const name = truncate(description || categoryName || legacyReference, 255);

      parsedRows.push({
        warehouse: sheetConfig.warehouse,
        seriesId: sheetConfig.seriesId,
        sheetName: sheetConfig.sheetName,
        legacyReference,
        categoryName,
        name,
        description,
        color: normalizeText(row[5]),
        sizeLabel: normalizeText(row[6]),
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

const ensureCategoryId = async (cache: Map<string, number>, categoryName: string) => {
  const key = categoryName.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await db.query.categories.findMany({
    where: eq(categories.isDeleted, false),
  });
  const match = existing.find(
    (category) => category.name.trim().toLowerCase() === key,
  );
  if (match) {
    cache.set(key, match.id);
    return match.id;
  }

  if (dryRun) {
    const fakeId = cache.size + 1000;
    cache.set(key, fakeId);
    return fakeId;
  }

  const [created] = await db
    .insert(categories)
    .values({
      name: truncate(categoryName, 255),
      description: "Imported from warehouse stock spreadsheet",
      parentId: null,
      level: 1,
      createdBy: DEFAULT_USER_ID,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning({ id: categories.id });

  cache.set(key, created.id);
  return created.id;
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
      const categoryId = await ensureCategoryId(categoryCache, row.categoryName);
      const directOrderCode = row.legacyReference;
      const price = parsePrice(row.unitPrice);
      const shortDescription = truncate(row.description || row.categoryName, 500);
      const specifications = buildSpecifications(row);

      if (dryRun) {
        mapping.push({
          legacyReference: row.legacyReference,
          newProductId: mapping.length + 1,
          directOrderCode,
          name: row.name,
          warehouse: row.warehouse,
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

      mapping.push({
        legacyReference: row.legacyReference,
        newProductId: product.id,
        directOrderCode,
        name: row.name,
        warehouse: row.warehouse,
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
  console.log("\nImage naming guide:");
  console.log("- Legacy spreadsheet files may still use the old reference, e.g. DO-TR-B1-E01B.jpg");
  console.log("- New app uploads should use new product ID prefixes, e.g. 123-1.jpg, 123-2.jpg");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
