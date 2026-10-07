/* eslint-disable no-console */
import "dotenv/config";

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertWarehouseXlsxExists,
  resolveWarehouseXlsxPath,
} from "./warehouse-xlsx-path";
import {
  loadWorkbookRowsByReference,
  normalizeLegacyReference,
  normalizeProductReferenceKey,
} from "./warehouse-import-utils";
import {
  compactBinLocationKey,
  normalizeBinLocationKey,
} from "./warehouse-xlsx-bin-location.util";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultReportDir = resolve(scriptDir, "../../data/imports");

const args = process.argv.slice(2);
const xlsxPath = resolveWarehouseXlsxPath(args);
assertWarehouseXlsxExists(xlsxPath);

const apiBase = (
  process.env.API_BASE_URL || "https://api.edoshop.online/v1"
).replace(/\/$/, "");
const storeId = Number(process.env.WAREHOUSE_COMPARE_STORE_ID || "1");
const pageSize = 200;

type ApiProduct = {
  id: number;
  name: string;
  directOrderCode?: string | null;
  totalItems?: number | null;
  specifications?: string | null;
};

const parseBinFromSpecifications = (specs: string | null | undefined) => {
  if (!specs) return "";
  const match = specs.match(/Bin Location:\s*([^\n]+)/i);
  return match?.[1]?.trim() || "";
};

const binKey = (raw: string) =>
  compactBinLocationKey(raw) || normalizeBinLocationKey(raw) || "";

async function fetchAllCatalogProducts(): Promise<ApiProduct[]> {
  const all: ApiProduct[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const url = `${apiBase}/public/products?storeId=${storeId}&page=${page}&limit=${pageSize}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`API ${response.status} for ${url}`);
    }
    const json = (await response.json()) as {
      success?: boolean;
      data?: ApiProduct[];
      meta?: { pagination?: { total?: number; hasNextPage?: boolean } };
    };
    const batch = json.data || [];
    total = json.meta?.pagination?.total ?? batch.length;
    const hasNext = json.meta?.pagination?.hasNextPage ?? batch.length === pageSize;
    all.push(...batch);
    if (!batch.length || !hasNext) break;
    page += 1;
  }

  return all;
}

async function main() {
  console.log(`Workbook: ${xlsxPath}`);
  console.log(`API: ${apiBase} (storeId=${storeId})`);

  const sheetRows = loadWorkbookRowsByReference(xlsxPath);
  const sheetByKey = new Map<string, ReturnType<typeof loadWorkbookRowsByReference> extends Map<string, infer R> ? R : never>();

  for (const row of sheetRows.values()) {
    const key = normalizeProductReferenceKey(row.legacyReference);
    if (key) sheetByKey.set(key, row);
  }

  const products = await fetchAllCatalogProducts();
  const prodByKey = new Map<string, ApiProduct>();

  for (const product of products) {
    const code = product.directOrderCode?.trim();
    if (!code) continue;
    const key = normalizeProductReferenceKey(code);
    if (key) prodByKey.set(key, product);
  }

  const missingInProd: string[] = [];
  const missingInSheet: string[] = [];
  const binMismatch: Array<{
    code: string;
    sheetBin: string;
    prodBin: string;
  }> = [];
  const nameMismatch: Array<{ code: string; sheetName: string; prodName: string }> = [];
  const qtyMismatch: Array<{
    code: string;
    sheetQty: string;
    prodQty: number | null | undefined;
  }> = [];

  for (const [key, row] of sheetByKey) {
    const product = prodByKey.get(key);
    if (!product) {
      missingInProd.push(row.legacyReference);
      continue;
    }

    const sheetName = row.name.trim().toLowerCase();
    const prodName = (product.name || "").trim().toLowerCase();
    if (sheetName && prodName && sheetName !== prodName) {
      nameMismatch.push({
        code: row.legacyReference,
        sheetName: row.name,
        prodName: product.name,
      });
    }

    const sheetBin = row.binLocation?.trim() || "";
    const prodBin = parseBinFromSpecifications(product.specifications);
    if (sheetBin && prodBin) {
      const sheetKey = binKey(sheetBin);
      const prodKey = binKey(prodBin);
      if (sheetKey && prodKey && sheetKey !== prodKey) {
        binMismatch.push({
          code: row.legacyReference,
          sheetBin,
          prodBin,
        });
      }
    }

    const sheetQty = String(row.remainingStock || row.quantity || "").trim();
    if (sheetQty && product.totalItems != null) {
      const sheetNum = Number(sheetQty.replace(/[^\d.]/g, ""));
      if (!Number.isNaN(sheetNum) && sheetNum !== Number(product.totalItems)) {
        qtyMismatch.push({
          code: row.legacyReference,
          sheetQty,
          prodQty: product.totalItems,
        });
      }
    }
  }

  for (const [key, product] of prodByKey) {
    if (!sheetByKey.has(key)) {
      missingInSheet.push(product.directOrderCode || key);
    }
  }

  const sheetWithoutBin = [...sheetByKey.values()].filter(
    (row) => !row.binLocation?.trim(),
  ).length;

  console.log("\n=== Sheet vs production catalog (public API) ===");
  console.log(`Sheet rows (unique refs): ${sheetByKey.size}`);
  console.log(`Prod direct-order products (API): ${prodByKey.size}`);
  console.log(`Missing in prod (in sheet only): ${missingInProd.length}`);
  console.log(`Extra in prod (not in sheet): ${missingInSheet.length}`);
  console.log(`Sheet rows without bin: ${sheetWithoutBin}`);
  console.log(`Name mismatches: ${nameMismatch.length}`);
  console.log(`Bin mismatches (spec vs sheet col): ${binMismatch.length}`);
  console.log(`Quantity mismatches: ${qtyMismatch.length}`);

  const sample = (items: string[], n = 15) => items.slice(0, n);

  if (missingInProd.length) {
    console.log("\nSample missing in prod:");
    for (const code of sample(missingInProd)) console.log(`  - ${code}`);
  }
  if (missingInSheet.length) {
    console.log("\nSample extra in prod:");
    for (const code of sample(missingInSheet)) console.log(`  - ${code}`);
  }
  if (binMismatch.length) {
    console.log("\nSample bin mismatches:");
    for (const row of binMismatch.slice(0, 15)) {
      console.log(`  - ${row.code}: sheet=${row.sheetBin} prod=${row.prodBin}`);
    }
  }

  const report = {
    comparedAt: new Date().toISOString(),
    xlsxPath,
    apiBase,
    sheetUniqueRefs: sheetByKey.size,
    prodCatalogCount: prodByKey.size,
    missingInProd,
    missingInSheet,
    binMismatch,
    nameMismatch: nameMismatch.slice(0, 100),
    qtyMismatch: qtyMismatch.slice(0, 100),
    sheetWithoutBin,
  };

  mkdirSync(defaultReportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(
    defaultReportDir,
    `warehouse-sheet-prod-compare-${stamp}.json`,
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nFull report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
