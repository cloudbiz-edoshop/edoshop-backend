/* eslint-disable no-console */
import { resolve } from "node:path";

import { eq, inArray } from "drizzle-orm";

import { storageService } from "@/common/services/storage.service";
import db from "@/db";
import { products } from "@/db/models";

import {
  getImageContentType,
  getImageExtension,
  loadWorkbookImagesByReference,
} from "./warehouse-xlsx-images";
import { loadDirectOrderProductIdsByCode } from "./warehouse-import-utils";

const defaultXlsxPath =
  "/Users/mc/Downloads/Stock Disponible Warehouse 1 (1).xlsx";
const UPLOAD_CONCURRENCY = 8;

const isRealImageUrl = (url: string) =>
  /^https?:\/\//i.test(url)
  && !/dry-run|placeholder|example\.com|dummy/i.test(url);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const fileArgIndex = args.findIndex((arg) => arg === "--file");
const xlsxPath =
  fileArgIndex >= 0 ? resolve(args[fileArgIndex + 1] || "") : defaultXlsxPath;

const runPool = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) => {
  let index = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
};

async function main() {
  console.log(`Reading workbook images: ${xlsxPath}`);
  const imagesByReference = loadWorkbookImagesByReference(xlsxPath);
  console.log(`Found images for ${imagesByReference.size} product references.`);

  const productIdsByCode = await loadDirectOrderProductIdsByCode();
  const jobs: Array<{ reference: string; productId: number; buffers: Buffer[] }> = [];
  let missingProducts = 0;

  for (const [reference, buffers] of imagesByReference.entries()) {
    const productId = productIdsByCode.get(reference);
    if (!productId) {
      missingProducts += 1;
      continue;
    }
    jobs.push({ reference, productId, buffers });
  }

  const productIds = jobs.map((job) => job.productId);
  const productRows = productIds.length
    ? await db
        .select({ id: products.id, imageUrls: products.imageUrls })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const imageUrlsByProductId = new Map(
    productRows.map((row) => [row.id, row.imageUrls ?? []]),
  );

  let uploadedProducts = 0;
  let uploadedImages = 0;
  let skippedExisting = 0;

  const pendingJobs = jobs.filter((job) => {
    const existingUrls = (imageUrlsByProductId.get(job.productId) ?? []).filter(
      (url): url is string => typeof url === "string" && isRealImageUrl(url),
    );
    if (existingUrls.length > 0 && !force) {
      skippedExisting += 1;
      return false;
    }
    return true;
  });

  console.log(`Uploading images for ${pendingJobs.length} products (${UPLOAD_CONCURRENCY} at a time)...`);

  await runPool(pendingJobs, UPLOAD_CONCURRENCY, async (job) => {
    const imageUrls: string[] = [];

    for (const [index, buffer] of job.buffers.entries()) {
      const extension = getImageExtension(buffer);
      const fileName = `${job.productId}-${index + 1}.${extension}`;
      const contentType = getImageContentType(extension);

      if (dryRun) {
        imageUrls.push(`https://dry-run.local/${fileName}`);
        continue;
      }

      const url = await storageService.uploadBuffer(buffer, fileName, contentType);
      imageUrls.push(url);
      uploadedImages += 1;
    }

    if (!dryRun && imageUrls.length) {
      await db
        .update(products)
        .set({
          imageUrls,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, job.productId));
    }

    uploadedProducts += 1;
  });

  console.log("\nImage import complete.");
  console.log(`${dryRun ? "Would update" : "Updated"} products: ${uploadedProducts}`);
  console.log(`${dryRun ? "Would upload" : "Uploaded"} images: ${uploadedImages}`);
  console.log(`Skipped products with existing images: ${skippedExisting}`);
  console.log(`Spreadsheet references missing in DB: ${missingProducts}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
