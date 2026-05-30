import type { Database } from "@/db";

import { TAGS } from "@/constants/tags.constants";

import { tags as tagsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedTags(db: Database) {
  for (let i = 0; i < TAGS.length; i += CHUNK_SIZE) {
    const chunk = TAGS.slice(i, i + CHUNK_SIZE).map((tag) => ({
      ...tag,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.insert(tagsTable).values(chunk);
  }
}
