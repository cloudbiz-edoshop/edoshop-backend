/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";

import db from "@/db";
import { directOrderProducts, products } from "@/db/models";

import { loadWorkbookImagesByReference } from "./warehouse-xlsx-images";
import {
  loadDirectOrderProductIdsByCode,
  loadWorkbookRowsByReference,
  normalizeLegacyReference,
} from "./warehouse-import-utils";

const defaultXlsxPath =
  "/Users/mc/Downloads/Stock Disponible Warehouse 1 (1).xlsx";

const args = process.argv.slice(2);
const fileArgIndex = args.findIndex((arg) => arg === "--file");
const xlsxPath =
  fileArgIndex >= 0 ? resolve(args[fileArgIndex + 1] || "") : defaultXlsxPath;

const isRealImageUrl = (url: string) =>
  /^https?:\/\//i.test(url)
  && !/dry-run|placeholder|example\.com|dummy/i.test(url);

async function main() {
  console.log("Loading spreadsheet (rows only, fast)...");
  const rows = loadWorkbookRowsByReference(xlsxPath);
  console.log("Loading embedded photos...");
  const images = loadWorkbookImagesByReference(xlsxPath);
  const codes = await loadDirectOrderProductIdsByCode();

  const allProducts = await db
    .select({
      id: products.id,
      imageUrls: products.imageUrls,
      code: directOrderProducts.directOrderCode,
    })
    .from(products)
    .innerJoin(directOrderProducts, eq(directOrderProducts.productId, products.id));

  let withRealImages = 0;
  let missingDespiteXlsxPhoto = 0;
  let emptyInXlsxNoPhoto = 0;
  let emptyNotInSpreadsheet = 0;

  const gaps: string[] = [];

  for (const product of allProducts) {
    const code = normalizeLegacyReference(product.code || "");
    const urls = Array.isArray(product.imageUrls)
      ? product.imageUrls.filter((url): url is string => typeof url === "string")
      : [];
    const hasReal = urls.some(isRealImageUrl);
    const hasXlsxPhoto = images.has(code);
    const inSpreadsheet = rows.has(code);

    if (hasReal) {
      withRealImages += 1;
      continue;
    }

    if (hasXlsxPhoto) {
      missingDespiteXlsxPhoto += 1;
      gaps.push(`${code} (#${product.id})`);
      continue;
    }

    if (inSpreadsheet) emptyInXlsxNoPhoto += 1;
    else emptyNotInSpreadsheet += 1;
  }

  const xlsxPhotosMissingDb = [...images.keys()].filter((ref) => !codes.has(ref));

  console.log("\n=== Warehouse image audit ===");
  console.log(`Spreadsheet products: ${rows.size}`);
  console.log(`Spreadsheet with embedded photo: ${images.size}`);
  console.log(`Spreadsheet without embedded photo: ${rows.size - images.size}`);
  console.log(`DB direct-order products: ${allProducts.length}`);
  console.log(`DB with real uploaded images: ${withRealImages}`);
  console.log(`DB missing image BUT xlsx has photo: ${missingDespiteXlsxPhoto}`);
  console.log(`DB empty, in xlsx, no photo in file: ${emptyInXlsxNoPhoto}`);
  console.log(`DB empty, not in spreadsheet: ${emptyNotInSpreadsheet}`);
  console.log(`Xlsx photos with no DB product: ${xlsxPhotosMissingDb.length}`);

  if (gaps.length) {
    console.log("\nGaps to fix:", gaps.slice(0, 20).join(", "));
  }

  if (xlsxPhotosMissingDb.length) {
    console.log("\nImport these codes first:", xlsxPhotosMissingDb.join(", "));
  }

  const reportPath = resolve(
    process.cwd(),
    "data/imports/warehouse-image-audit.json",
  );
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        withRealImages,
        missingDespiteXlsxPhoto,
        emptyInXlsxNoPhoto,
        emptyNotInSpreadsheet,
        xlsxPhotosMissingDb,
        gaps,
      },
      null,
      2,
    ),
  );
  console.log(`\nReport: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
