import type {
  MobileDeleteImagesRoute,
  MobileListImagesRoute,
  MobileUploadRoute,
} from "./mobile-upload.route";

import type { AppRouteHandler } from "@/lib/types";

import { AppError } from "@/core/errors";
import { successResponse } from "@/lib/api-response";
import * as HttpStatus from "@/lib/http-status-codes";

import { MobileUploadService } from "./mobile-upload.service";

const mobileUploadService = new MobileUploadService();

const isUploadedFile = (value: FormDataEntryValue): value is File => (
  typeof value === "object"
  && value !== null
  && "arrayBuffer" in value
  && "name" in value
  && "type" in value
);

export const uploadImages: AppRouteHandler<MobileUploadRoute> = async (c) => {
  const { token } = c.req.valid("param");

  const formData = await c.req.formData();
  const fileList: File[] = [];

  for (const [key, value] of formData.entries()) {
    if (key === "files" && isUploadedFile(value)) {
      fileList.push(value);
    }
  }

  if (fileList.length === 0) {
    throw new AppError("No files uploaded", HttpStatus.BAD_REQUEST);
  }

  const result = await mobileUploadService.uploadImages(token, fileList);

  return c.json(
    successResponse(result, "Images uploaded successfully"),
    HttpStatus.OK,
  );
};

export const listImages: AppRouteHandler<MobileListImagesRoute> = async (c) => {
  const { token } = c.req.valid("param");

  const result = await mobileUploadService.listImages(token);

  return c.json(
    successResponse(result, "Images retrieved successfully"),
    HttpStatus.OK,
  );
};

export const deleteImages: AppRouteHandler<MobileDeleteImagesRoute> = async (c) => {
  const { token } = c.req.valid("param");
  const { fileNames } = c.req.valid("json");

  const result = await mobileUploadService.deleteImages(token, fileNames);

  return c.json(
    successResponse(result, "Images deleted successfully"),
    HttpStatus.OK,
  );
};
