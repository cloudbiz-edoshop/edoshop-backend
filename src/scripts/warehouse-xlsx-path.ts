import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_WAREHOUSE_XLSX_PATH = resolve(
  backendRoot,
  "data/imports/warehouse-stock.xlsx",
);

export const resolveWarehouseXlsxPath = (args: string[] = process.argv.slice(2)) => {
  const fileArgIndex = args.findIndex((arg) => arg === "--file");
  if (fileArgIndex >= 0 && args[fileArgIndex + 1]) {
    return resolve(args[fileArgIndex + 1]);
  }

  if (process.env.WAREHOUSE_XLSX_PATH?.trim()) {
    return resolve(process.env.WAREHOUSE_XLSX_PATH.trim());
  }

  return DEFAULT_WAREHOUSE_XLSX_PATH;
};

export const assertWarehouseXlsxExists = (xlsxPath: string) => {
  if (existsSync(xlsxPath)) {
    return;
  }

  throw new Error(
    [
      `Warehouse spreadsheet not found: ${xlsxPath}`,
      "",
      "On the server, upload the Excel file first, then run one of:",
      `  npm run products:feed-warehouse-xlsx -- --prod --file /app/data/imports/warehouse-stock.xlsx`,
      `  WAREHOUSE_XLSX_PATH=/app/data/imports/warehouse-stock.xlsx npm run products:feed-warehouse-xlsx -- --prod`,
      "",
      `Default path inside the app: ${DEFAULT_WAREHOUSE_XLSX_PATH}`,
    ].join("\n"),
  );
};
