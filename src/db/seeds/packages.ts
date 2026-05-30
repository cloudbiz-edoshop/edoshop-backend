import type { Database } from "@/db";

import { PACKAGES_DATA } from "@/constants/entries/packages.constants";

import { packages } from "../models/packages";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < PACKAGES_DATA.length; i += CHUNK_SIZE) {
    const chunk = PACKAGES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(packages).values(chunk);
  }
}
