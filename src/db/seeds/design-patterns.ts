import type { Database } from "@/db";

import { DESIGN_PATTERNS } from "@/constants/design-patterns.constants";
import { designPatterns as designPatternsTable } from "@/db/models/design-patterns";

const CHUNK_SIZE = 50;

export default async function designPatternsSeed(db: Database) {
  for (let i = 0; i < DESIGN_PATTERNS.length; i += CHUNK_SIZE) {
    const chunk = DESIGN_PATTERNS.slice(i, i + CHUNK_SIZE).map((pattern) => ({
      name: pattern.name,
      description: pattern.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: pattern.createdBy,
      updatedBy: pattern.updatedBy,
    }));

    await db.insert(designPatternsTable).values(chunk);
  }
}
