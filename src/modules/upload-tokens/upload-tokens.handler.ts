import type {
  GenerateUploadTokenRoute,
  ValidateUploadTokenRoute,
} from "./upload-tokens.route";

import type { AppRouteHandler } from "@/lib/types";

import { successResponse } from "@/lib/api-response";
import * as HttpStatus from "@/lib/http-status-codes";

import { UploadTokensService } from "./upload-tokens.service";

const uploadTokensService = new UploadTokensService();

export const generateToken: AppRouteHandler<GenerateUploadTokenRoute> = async (c) => {
  const { entryId } = c.req.valid("param");

  const result = await uploadTokensService.generateToken(Number(entryId));

  return c.json(
    successResponse(result, "Upload token generated successfully"),
    HttpStatus.CREATED,
  );
};

export const validateToken: AppRouteHandler<ValidateUploadTokenRoute> = async (c) => {
  const { token } = c.req.valid("param");

  const result = await uploadTokensService.validateToken(token);

  return c.json(
    successResponse(result, "Token validation result"),
    HttpStatus.OK,
  );
};
