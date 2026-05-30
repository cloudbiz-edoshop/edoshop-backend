import type { Database } from "@/db";

import { countries as countriesTable } from "../models";
import countries from "./data/countries.json";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process countries in chunks
  for (let i = 0; i < countries.length; i += CHUNK_SIZE) {
    const chunk = countries.slice(i, i + CHUNK_SIZE);
    await db.insert(countriesTable).values(chunk);
  }
}
