import type { Database } from "@/db";

import { SERIES_DATA } from "@/constants/entries/series.constants";

import { series } from "../models/series";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < SERIES_DATA.length; i += CHUNK_SIZE) {
    const chunk = SERIES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(series).values(chunk);
  }
}
