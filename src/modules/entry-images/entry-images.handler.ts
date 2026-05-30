import type {
  DeleteEntryImagesRoute,
  ListEntryImagesRoute,
  ReplaceEntryImagesRoute,
  UploadEntryImagesRoute,
} from "./entry-images.route";

import type { AppRouteHandler } from "@/lib/types";

import { AppError } from "@/core/errors";
import { successResponse } from "@/lib/api-response";
import * as HttpStatus from "@/lib/http-status-codes";

import { EntryImagesService } from "./entry-images.service";

const entryImagesService = new EntryImagesService();

export const listImages: AppRouteHandler<ListEntryImagesRoute> = async (c) => {
  const { entryId } = c.req.valid("param");

  const result = await entryImagesService.listImages(Number(entryId));

  return c.json(
    successResponse(result, "Entry images retrieved successfully"),
    HttpStatus.OK,
  );
};

export const uploadImages: AppRouteHandler<UploadEntryImagesRoute> = async (c) => {
  const { entryId } = c.req.valid("param");

  const formData = await c.req.formData();
  const fileList: File[] = [];

  for (const [key, value] of formData.entries()) {
    if (key === "files" && value instanceof File) {
      fileList.push(value);
    }
  }

  if (fileList.length === 0) {
    throw new AppError("No files uploaded", HttpStatus.BAD_REQUEST);
  }

  const result = await entryImagesService.uploadImages(
    Number(entryId),
    fileList,
  );

  return c.json(
    successResponse(result, "Images uploaded successfully"),
    HttpStatus.OK,
  );
};

export const replaceImages: AppRouteHandler<ReplaceEntryImagesRoute> = async (c) => {
  const { entryId } = c.req.valid("param");

  const formData = await c.req.formData();
  const fileList: File[] = [];
  const existingFileNames: string[] = [];

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

  const result = await entryImagesService.replaceImages(
    Number(entryId),
    fileList,
    existingFileNames,
  );

  return c.json(
    successResponse(result, "Images replaced successfully"),
    HttpStatus.OK,
  );
};

export const deleteImages: AppRouteHandler<DeleteEntryImagesRoute> = async (c) => {
  const { entryId } = c.req.valid("param");
  const { fileNames } = c.req.valid("json");

  const result = await entryImagesService.deleteImages(
    Number(entryId),
    fileNames,
  );

  return c.json(
    successResponse(result, "Images deleted successfully"),
    HttpStatus.OK,
  );
};
