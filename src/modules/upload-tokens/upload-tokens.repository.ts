import type { NewUploadToken } from "@/db/models/upload-tokens";
import type { TX } from "@/lib/types";

import { and, eq, gt, lt } from "drizzle-orm";

import db from "@/db";
import { uploadTokens } from "@/db/models";

export class UploadTokensRepository {
  async findByToken(token: string) {
    return db.query.uploadTokens.findFirst({
      where: eq(uploadTokens.token, token),
    });
  }

  async findValidToken(token: string) {
    const now = new Date().toISOString();
    return db.query.uploadTokens.findFirst({
      where: and(
        eq(uploadTokens.token, token),
        gt(uploadTokens.expiresAt, now),
      ),
    });
  }

  async create(tx: TX, data: NewUploadToken) {
    const [created] = await tx.insert(uploadTokens).values(data).returning();
    return created;
  }

  async deleteExpiredTokens(tx: TX) {
    const now = new Date().toISOString();
    await tx.delete(uploadTokens).where(lt(uploadTokens.expiresAt, now));
  }
}
