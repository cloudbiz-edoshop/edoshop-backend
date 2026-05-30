import type {
  CreateRoute,
  GetByProductIdRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveSelectedRoute,
} from "./variants.route";

import type {
  CreateVariantResponse,
  GetVariantResponse,
  ListVariantsResponse,
} from "./variants.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { VariantsService } from "./variants.service";

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

const variantsService = new VariantsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = query;

  const result = await variantsService.listVariants({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const variantsWithJsonInfo = result.data.map((variant) => ({
    ...variant,
    additionalInfo: variant.additionalInfo as JsonValue, // Cast here
  }));

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListVariantsResponse>(
      variantsWithJsonInfo,
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const variant = await variantsService.getVariantById(id);
  const variantWithJsonInfo = {
    ...variant,
    additionalInfo: variant.additionalInfo as JsonValue, // Cast here
  };
  return c.json(
    successResponse<GetVariantResponse>(
      variantWithJsonInfo,
      STANDARD_MESSAGES.SUCCESS.FETCHED,
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  const newVariant = await variantsService.createVariant({
    ...body,
    createdBy: user.id,
  });

  return c.json(
    successResponse<CreateVariantResponse>(
      newVariant,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.OK,
  );
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const updatedVariant = await variantsService.updateVariant(id, {
    ...body,
    updatedBy: user.id,
  });

  return c.json(
    successResponse<CreateVariantResponse>(
      updatedVariant,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const user = c.get("user");

  await variantsService.deleteVariants(ids, user.id);

  return c.json(
    successResponse(null, STANDARD_MESSAGES.SUCCESS.DELETED),
    HttpStatusCodes.OK,
  );
};

export const getByProductId: AppRouteHandler<GetByProductIdRoute> = async (
  c,
) => {
  const { productId } = c.req.valid("param");
  const variants = await variantsService.getVariantsByProductId(
    Number.parseInt(productId),
  );

  return c.json(
    successResponse(variants, STANDARD_MESSAGES.SUCCESS.FETCHED),
    HttpStatusCodes.OK,
  );
};
