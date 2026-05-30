import type { Database } from "@/db";

import { WAREHOUSE_TRANSFERS_HISTORY_DATA } from "@/constants/warehouse-transfers-history.constants";

import { warehouseTransfersHistory } from "../models/warehouse-transfers-history";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (
    let i = 0;
    i < WAREHOUSE_TRANSFERS_HISTORY_DATA.length;
    i += CHUNK_SIZE
  ) {
    const chunk = WAREHOUSE_TRANSFERS_HISTORY_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(warehouseTransfersHistory).values(chunk);
  }
}
