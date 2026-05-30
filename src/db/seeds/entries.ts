import type { Database } from "@/db";

import { ENTRIES_DATA } from "@/constants/entries/entries.constants";

import { entries as EntriesTable } from "../models/entries";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < ENTRIES_DATA.length; i += CHUNK_SIZE) {
    const chunk = ENTRIES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(EntriesTable).values(chunk);
  }
}
