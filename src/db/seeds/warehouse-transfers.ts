import type { Database } from "@/db";

import { WAREHOUSE_TRANSFERS_DATA } from "@/constants/warehouse-transfers.constants";

import { warehouseTransfers } from "../models/warehouse-transfers";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < WAREHOUSE_TRANSFERS_DATA.length; i += CHUNK_SIZE) {
    const chunk = WAREHOUSE_TRANSFERS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(warehouseTransfers).values(chunk);
  }
}
