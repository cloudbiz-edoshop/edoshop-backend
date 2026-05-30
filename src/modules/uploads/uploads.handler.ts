import type {
  DeleteFilesRoute,
  GetFileInfoRoute,
  ListFilesRoute,
  PresignedUrlRoute,
  ReplaceFilesRoute,
  UploadFilesRoute,
} from "./uploads.route";

import type { AppRouteHandler } from "@/lib/types";

import { nanoid } from "nanoid";
import { storageService } from "@/common/services/storage.service";
import { AppError } from "@/core/errors";
import { successResponse } from "@/lib/api-response";

import * as HttpStatus from "@/lib/http-status-codes";

export const getPresignedUrl: AppRouteHandler<PresignedUrlRoute> = async (c) => {
  const { fileName } = c.req.valid("json");

  // Use the provided filename exactly for presigned URL
  const url = await storageService.getPresignedUrl(fileName);

  return c.json(
    successResponse({ url, fileName }, "Presigned URL generated"),
    HttpStatus.OK,
  );
};

export const getFileInfo: AppRouteHandler<GetFileInfoRoute> = async (c) => {
  const { fileName } = c.req.valid("param");

  const fileInfo = await storageService.getFileInfo(fileName);

  return c.json(
    successResponse(fileInfo, "File info retrieved"),
    HttpStatus.OK,
  );
};

export const uploadFiles: AppRouteHandler<UploadFilesRoute> = async (c) => {
  // Get all form entries to handle multiple file uploads
  const formData = await c.req.formData();
  const fileList: File[] = [];

  // Extract all files from the 'files' field
  for (const [key, value] of formData.entries()) {
    if (key === "files" && value instanceof File) {
      fileList.push(value);
    }
  }

  if (fileList.length === 0) {
    throw new AppError("No files uploaded", HttpStatus.BAD_REQUEST);
  }

  if (fileList.length > 10) {
    throw new AppError("Maximum 10 files allowed per upload", HttpStatus.BAD_REQUEST);
  }

  const uploads: Array<{ url: string; fileName: string }> = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  // Upload each file
  for (const file of fileList) {
    try {
      const extension = file.name.split(".").pop();
      const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      const fileName = `${nameWithoutExtension}-${nanoid()}.${extension}`;
      const url = await storageService.uploadFile(file, fileName);
      uploads.push({ url, fileName });
    } catch (error) {
      failed.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  return c.json(
    successResponse({ uploads, failed }, "Files uploaded successfully"),
    HttpStatus.OK,
  );
};

export const deleteFiles: AppRouteHandler<DeleteFilesRoute> = async (c) => {
  const { fileNames } = c.req.valid("json");

  const deleted: string[] = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  for (const fileName of fileNames) {
    try {
      await storageService.deleteFile(fileName);
      deleted.push(fileName);
    } catch (error) {
      failed.push({
        fileName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return c.json(
    successResponse({ deleted, failed }, "Batch delete completed"),
    HttpStatus.OK,
  );
};

export const listFiles: AppRouteHandler<ListFilesRoute> = async (c) => {
  const { prefix } = c.req.valid("query");

  const files = await storageService.listFiles(prefix);

  return c.json(
    successResponse({ files, totalCount: files.length }, "Files retrieved successfully"),
    HttpStatus.OK,
  );
};

async function processFileReplacement(file: File, existingFileName: string) {
  // Check if file exists
  const exists = await storageService.fileExists(existingFileName);
  if (!exists) {
    throw new Error("File does not exist");
  }

  const newExtension = file.name.split(".").pop()?.toLowerCase();

  // we must generate a new filename to avoid content-type mismatch

  const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
  const newFileName = `${nameWithoutExtension}-${nanoid()}.${newExtension}`;

  const url = await storageService.uploadFile(file, newFileName);

  // Try to delete the old file
  try {
    await storageService.deleteFile(existingFileName);
  } catch (error) {
    console.warn(`Failed to delete old file ${existingFileName} during replacement:`, error);
    // We continue even if delete fails, as the new file is uploaded successfully
  }

  return { url, fileName: newFileName };
}

export const replaceFiles: AppRouteHandler<ReplaceFilesRoute> = async (c) => {
  const formData = await c.req.formData();
  const fileList: File[] = [];
  const existingFileNames: string[] = [];

  // Extract files and existing file names
  for (const [key, value] of formData.entries()) {
    if (key === "files" && value instanceof File) {
      fileList.push(value);
    } else if (key === "existingFileNames" && typeof value === "string") {
      existingFileNames.push(value);
    }
  }

  if (fileList.length === 0) {
    throw new AppError("No files uploaded", HttpStatus.BAD_REQUEST);
  }

  if (fileList.length !== existingFileNames.length) {
    throw new AppError("Number of files must match number of existing file names", HttpStatus.BAD_REQUEST);
  }

  const uploads: Array<{ url: string; fileName: string }> = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  // Replace each file
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const existingFileName = existingFileNames[i];

    try {
      const result = await processFileReplacement(file, existingFileName);
      uploads.push(result);
    } catch (error) {
      failed.push({
        fileName: existingFileName,
        error: error instanceof Error ? error.message : "Replace failed",
      });
    }
  }

  return c.json(
    successResponse({ uploads, failed }, "Files replaced successfully"),
    HttpStatus.OK,
  );
};
