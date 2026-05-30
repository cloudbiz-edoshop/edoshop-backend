import type { Database } from "@/db";

import { SHELVES_DATA } from "@/constants/shelves.constants";
import { shelves } from "@/db/models/shelves";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < SHELVES_DATA.length; i += CHUNK_SIZE) {
    const chunk = SHELVES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(shelves).values(chunk);
  }
}
