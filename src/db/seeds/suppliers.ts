import type { Database } from "@/db";

import { SUPPLIERS_DATA } from "@/constants/suppliers.constants";

import suppliers from "../models/suppliers";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < SUPPLIERS_DATA.length; i += CHUNK_SIZE) {
    const chunk = SUPPLIERS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(suppliers).values(chunk);
  }
}
