import type { Database } from "@/db";

import { STORES } from "@/constants/stores.constants";

import { stores as storesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedStores(db: Database) {
  for (let i = 0; i < STORES.length; i += CHUNK_SIZE) {
    const chunk = STORES.slice(i, i + CHUNK_SIZE).map((store) => ({
      ...store,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.insert(storesTable).values(chunk);
  }
}
