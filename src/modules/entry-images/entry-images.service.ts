import type { EntryImagesListResponse } from "./entry-images.schema";

import { nanoid } from "nanoid";

import { storageService } from "@/common/services/storage.service";
import { AppError, NotFoundError } from "@/core/errors";
import db from "@/db";
import * as HttpStatus from "@/lib/http-status-codes";

import { EntryImagesRepository } from "./entry-images.repository";

const MAX_IMAGES = 2;

export class EntryImagesService {
  private readonly repository: EntryImagesRepository;

  constructor() {
    this.repository = new EntryImagesRepository();
  }

  async listImages(entryId: number): Promise<EntryImagesListResponse> {
    const images = await this.repository.findByEntryId(entryId);
    return {
      files: images.map((img) => ({
        id: img.id,
        url: img.url,
        fileName: img.fileName,
      })),
      maxImages: MAX_IMAGES,
    };
  }

  async uploadImages(entryId: number, files: File[]) {
    const currentCount = await this.repository.countByEntryId(entryId);
    const remaining = MAX_IMAGES - currentCount;

    if (remaining <= 0) {
      throw new AppError(
        `Entry already has ${MAX_IMAGES} images. Delete existing images first.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (files.length > remaining) {
      throw new AppError(
        `Can only upload ${remaining} more image(s). Entry has ${currentCount}/${MAX_IMAGES} images.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploads: Array<{ id: number; url: string; fileName: string }> = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const extension = file.name.split(".").pop();
        const nameWithoutExtension =
          file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const fileName = `${nameWithoutExtension}-${nanoid()}.${extension}`;
        const url = await storageService.uploadFile(file, fileName);

        const created = await db.transaction(async (tx) => {
          return this.repository.create(tx, {
            entryId,
            fileName,
            url,
          });
        });

        uploads.push({ id: created.id, url: created.url, fileName: created.fileName });
      } catch (error) {
        failed.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    return { uploads, failed };
  }

  async replaceImages(
    entryId: number,
    files: File[],
    existingFileNames: string[],
  ) {
    if (files.length !== existingFileNames.length) {
      throw new AppError(
        "Number of files must match number of existing file names",
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploads: Array<{ id: number; url: string; fileName: string }> = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const existingFileName = existingFileNames[i];

      try {
        // Verify the existing image belongs to this entry
        const existingImage = await this.repository.findByFileName(
          entryId,
          existingFileName,
        );
        if (!existingImage) {
          throw new NotFoundError(
            `Image ${existingFileName} not found for this entry`,
          );
        }

        // Upload new file
        const extension = file.name.split(".").pop();
        const nameWithoutExtension =
          file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const newFileName = `${nameWithoutExtension}-${nanoid()}.${extension}`;
        const url = await storageService.uploadFile(file, newFileName);

        // Update DB record and delete old file
        const created = await db.transaction(async (tx) => {
          // Delete old DB record
          await this.repository.deleteByFileName(tx, entryId, existingFileName);
          // Create new DB record
          return this.repository.create(tx, {
            entryId,
            fileName: newFileName,
            url,
          });
        });

        // Try to delete old file from storage
        try {
          await storageService.deleteFile(existingFileName);
        } catch (error) {
          console.warn(
            `Failed to delete old file ${existingFileName} during replacement:`,
            error,
          );
        }

        uploads.push({ id: created.id, url: created.url, fileName: created.fileName });
      } catch (error) {
        failed.push({
          fileName: existingFileName,
          error: error instanceof Error ? error.message : "Replace failed",
        });
      }
    }

    return { uploads, failed };
  }

  async deleteImages(entryId: number, fileNames: string[]) {
    const deleted: string[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const fileName of fileNames) {
      try {
        const image = await this.repository.findByFileName(entryId, fileName);
        if (!image) {
          throw new NotFoundError(
            `Image ${fileName} not found for this entry`,
          );
        }

        await storageService.deleteFile(image.fileName);

        await db.transaction(async (tx) => {
          await this.repository.deleteByFileName(tx, entryId, image.fileName);
        });

        deleted.push(fileName);
      } catch (error) {
        failed.push({
          fileName,
          error: error instanceof Error ? error.message : "Delete failed",
        });
      }
    }

    return { deleted, failed };
  }
}
