import type { Database } from "@/db";

import { STORAGE_DATA } from "@/constants/storage.constants";
import { storage } from "@/db/models/storage";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < STORAGE_DATA.length; i += CHUNK_SIZE) {
    const chunk = STORAGE_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(storage).values(chunk);
  }
}
