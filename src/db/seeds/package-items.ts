import type { Database } from "@/db";

import { PACKAGE_ITEMS_DATA } from "../../constants/package-items.constants";
import { packageItems as packageItemsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < PACKAGE_ITEMS_DATA.length; i += CHUNK_SIZE) {
    const chunk = PACKAGE_ITEMS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(packageItemsTable).values(chunk);
  }
}
