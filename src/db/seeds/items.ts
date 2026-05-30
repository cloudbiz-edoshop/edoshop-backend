import type { Database } from "@/db";

import { ITEMS_DATA } from "@/constants/entries/items.constants";

import { items } from "../models/items";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < ITEMS_DATA.length; i += CHUNK_SIZE) {
    const chunk = ITEMS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(items).values(chunk);
  }
}
