import type { Database } from "@/db";

import {
  WAREHOUSE_DESCRIPTIONS,
  WarehouseIds,
  WarehouseName,
} from "@/constants/warehouses.constants";

import { warehouses as warehousesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process warehouses in chunks
  for (let i = 0; i < Object.values(WarehouseName).length; i += CHUNK_SIZE) {
    const chunk = Object.values(WarehouseName)
      .slice(i, i + CHUNK_SIZE)
      .map((warehouseName) => ({
        id: WarehouseIds[warehouseName.toLowerCase()],
        name: warehouseName,
        description: WAREHOUSE_DESCRIPTIONS[warehouseName],
        addressId: 1, // Replace with a valid address ID
        isActive: true,
        isDeleted: false,
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(warehousesTable).values(chunk);
  }
}
