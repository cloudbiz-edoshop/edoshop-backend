import type { Database } from "@/db";

import { BUNDLES_DATA } from "@/constants/entries/bundles.constants";

import { bundles } from "../models/bundles";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < BUNDLES_DATA.length; i += CHUNK_SIZE) {
    const chunk = BUNDLES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(bundles).values(chunk);
  }
}
