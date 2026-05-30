import type { Database } from "@/db";

import { BINS_DATA } from "@/constants/bins.constants";
import { bins } from "@/db/models/bins";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < BINS_DATA.length; i += CHUNK_SIZE) {
    const chunk = BINS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(bins).values(chunk);
  }
}
