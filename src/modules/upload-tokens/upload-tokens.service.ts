import crypto from "node:crypto";

import { NotFoundError } from "@/core/errors";
import db from "@/db";

import { EntryImagesRepository } from "../entry-images/entry-images.repository";
import { UploadTokensRepository } from "./upload-tokens.repository";

const MAX_IMAGES = 2;
const TOKEN_TTL_MINUTES = 30;

export class UploadTokensService {
  private readonly repository: UploadTokensRepository;
  private readonly entryImagesRepository: EntryImagesRepository;

  constructor() {
    this.repository = new UploadTokensRepository();
    this.entryImagesRepository = new EntryImagesRepository();
  }

  async generateToken(entryId: number) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    const created = await db.transaction(async (tx) => {
      return this.repository.create(tx, {
        token,
        entryId,
        expiresAt,
      });
    });

    return {
      token: created.token,
      entryId: created.entryId,
      expiresAt: created.expiresAt,
    };
  }

  async validateToken(token: string) {
    const record = await this.repository.findValidToken(token);

    if (!record) {
      return { valid: false };
    }

    const currentCount = await this.entryImagesRepository.countByEntryId(
      record.entryId,
    );
    const remainingImages = MAX_IMAGES - currentCount;

    return {
      valid: true,
      entryId: record.entryId,
      maxImages: MAX_IMAGES,
      remainingImages,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Validate a token and return the entry ID.
   * Throws NotFoundError if token is invalid or expired.
   */
  async validateTokenOrThrow(token: string) {
    const record = await this.repository.findValidToken(token);

    if (!record) {
      throw new NotFoundError("Upload token is invalid or expired");
    }

    return record;
  }
}
