import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  OngoingRequestsByUserRoute,
  PatchRoute,
  RemoveRoute,
  UndoRoute,
} from "./ongoing-groups.route";

import type {
  OngoingGroupRequestResponse,
} from "./ongoing-groups.schema";
import type { AppRouteHandler } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";

import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import { OngoingGroupRequestsService } from "./ongoing-groups.service";

const service = new OngoingGroupRequestsService();

/**
 * List ongoing group requests
 */
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const result = await service.listOngoingGroupRequests({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  return c.json(
    {
      data: result.data.map(item => ({
        ...item,
        directOrderProduct:
          item.product?.directOrderProduct && item.product.directOrderProduct.productId != null
            ? {
                id: item.product.directOrderProduct.id,
                productId: item.product.directOrderProduct.productId,
                directOrderCode: item.product.directOrderProduct.directOrderCode,
              }
            : null,
        dropshippingProduct:
          item.product?.dropshippingProduct && item.product.dropshippingProduct.productId != null
            ? {
                id: item.product.dropshippingProduct.id,
                productId: item.product.dropshippingProduct.productId,
                dropshippingCode: item.product.dropshippingProduct.dropshippingCode,
              }
            : null,
      })),
      pagination: result.pagination,
      searchableFields: result.searchableFields,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get ongoing group request by ID
 */
export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const request = await service.getOngoingGroupRequestById(id);

  if (!request) {
    throw new Error("Ongoing group request not found");
  }

  return c.json(
    successResponse<OngoingGroupRequestResponse>(
      request,
      STANDARD_MESSAGES.SUCCESS.FETCHED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Create new ongoing group request
 * User requests a specific product variant (e.g., "small red t-shirt")
 */
export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  const request = await service.createOngoingGroupRequest({
    ...body,
    requestedBy: user.id,
    createdBy: user.id,
  });

  if (!request) {
    throw new Error("Failed to create ongoing group request");
  }

  return c.json(
    successResponse<OngoingGroupRequestResponse>(
      request,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.CREATED,
  );
};

/**
 * Update existing ongoing group request
 * Can be used to approve, reject, or modify the request
 */
export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const updated = await service.updateOngoingGroupRequest(id, {
    ...body,
    updatedBy: user.id,
  });

  if (!updated) {
    throw new Error("Failed to update ongoing group request");
  }

  return c.json(
    successResponse<OngoingGroupRequestResponse>(
      updated,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * Delete ongoing group request
 */
export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  await service.deleteOngoingGroupRequest(id);

  return c.json(
    {
      success: true,
      message: STANDARD_MESSAGES.SUCCESS.DELETED,
      data: null,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Undo approval or rejection - revert to pending status
 */
export const undo: AppRouteHandler<UndoRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const request = await service.undoRequest(id, user.id);

  if (!request) {
    throw new Error("Failed to undo ongoing group request");
  }

  return c.json(
    successResponse<OngoingGroupRequestResponse>(
      request,
      "Ongoing group request status reverted to pending successfully",
    ),
    HttpStatusCodes.OK,
  );
};

/**
 * List all ongoing groups and requests of the current user
 */
export const ongoingRequestsByUser: AppRouteHandler<OngoingRequestsByUserRoute> = async (c) => {
  const user = c.get("user");
  const result = await service.listOngoingRequestsByUser(user.id);
  return c.json({
    requests: result.requests.map(item => ({
      ...item,
      directOrderProduct:
        item.product?.directOrderProduct && item.product.directOrderProduct.productId != null
          ? {
              id: item.product.directOrderProduct.id,
              productId: item.product.directOrderProduct.productId,
              directOrderCode: item.product.directOrderProduct.directOrderCode,
            }
          : null,
      dropshippingProduct:
        item.product?.dropshippingProduct && item.product.dropshippingProduct.productId != null
          ? {
              id: item.product.dropshippingProduct.id,
              productId: item.product.dropshippingProduct.productId,
              dropshippingCode: item.product.dropshippingProduct.dropshippingCode,
            }
          : null,
    })),
  }, HttpStatusCodes.OK);
};
