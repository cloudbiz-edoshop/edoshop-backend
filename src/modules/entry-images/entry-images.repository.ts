import type { NewEntryImage } from "@/db/models/entry-images";
import type { TX } from "@/lib/types";

import { and, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { entryImages } from "@/db/models";

export class EntryImagesRepository {
  async findByEntryId(entryId: number) {
    return db.query.entryImages.findMany({
      where: eq(entryImages.entryId, entryId),
    });
  }

  async findByFileName(entryId: number, fileName: string) {
    return db.query.entryImages.findFirst({
      where: and(
        eq(entryImages.entryId, entryId),
        eq(entryImages.fileName, fileName),
      ),
    });
  }

  async countByEntryId(entryId: number): Promise<number> {
    const images = await db.query.entryImages.findMany({
      where: eq(entryImages.entryId, entryId),
    });
    return images.length;
  }

  async create(tx: TX, data: NewEntryImage) {
    const [created] = await tx.insert(entryImages).values(data).returning();
    return created;
  }

  async createMany(tx: TX, data: NewEntryImage[]) {
    const created = await tx.insert(entryImages).values(data).returning();
    return created;
  }

  async deleteByFileName(tx: TX, entryId: number, fileName: string) {
    const [deleted] = await tx
      .delete(entryImages)
      .where(
        and(
          eq(entryImages.entryId, entryId),
          eq(entryImages.fileName, fileName),
        ),
      )
      .returning();
    return deleted;
  }

  async deleteByFileNames(tx: TX, entryId: number, fileNames: string[]) {
    const deleted = await tx
      .delete(entryImages)
      .where(
        and(
          eq(entryImages.entryId, entryId),
          inArray(entryImages.fileName, fileNames),
        ),
      )
      .returning();
    return deleted;
  }
}
