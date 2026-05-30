import type { Database } from "@/db";

import { RAYONS_DATA } from "@/constants/rayons.constants";
import { rayons } from "@/db/models/rayons";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < RAYONS_DATA.length; i += CHUNK_SIZE) {
    const chunk = RAYONS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(rayons).values(chunk);
  }
}
