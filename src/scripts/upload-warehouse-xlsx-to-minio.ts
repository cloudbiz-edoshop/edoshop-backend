/* eslint-disable no-console */
import "dotenv/config";

import { statSync } from "node:fs";

import { Client } from "minio";

import env from "@/config/env.config";

const file = process.argv[2] || "data/imports/warehouse-stock.xlsx";
const key = "imports/warehouse-stock.xlsx";

const client = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

async function main() {
  const size = statSync(file).size;
  await client.fPutObject(env.MINIO_BUCKET_NAME, key, file, {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const base = env.MINIO_USE_SSL ? "https" : "http";
  const url = `${base}://${env.MINIO_ENDPOINT}/${env.MINIO_BUCKET_NAME}/${key}`;
  console.log(`Uploaded ${size} bytes to ${url}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
