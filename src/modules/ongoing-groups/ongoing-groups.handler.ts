import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  OngoingRequestsByUserRoute,
  ApproveGroupRoute,
  RejectGroupRoute,
  AdminGroupsRoute,
  AdminGroupByIdRoute,
  AdminCancelRoute,
  PatchRoute,
  ProductSummaryRoute,
  ActiveColorGroupsRoute,
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

const mapDropshippingProductResponse = (dropshippingProduct: {
  id: number;
  productId: number | null;
  dropshippingCode: string | null;
  totalItems?: number | null;
  groupCriteriaId?: number | { id?: number; name?: string | null } | null;
  completionCriteria?: string | null;
} | null | undefined) => {
  if (!dropshippingProduct?.productId) {
    return null;
  }

  const criteriaRelation = typeof dropshippingProduct.groupCriteriaId === "object"
    ? dropshippingProduct.groupCriteriaId
    : null;
  const criteriaId = typeof dropshippingProduct.groupCriteriaId === "number"
    ? dropshippingProduct.groupCriteriaId
    : criteriaRelation?.id ?? null;

  return {
    id: dropshippingProduct.id,
    productId: dropshippingProduct.productId,
    dropshippingCode: dropshippingProduct.dropshippingCode,
    totalItems: dropshippingProduct.totalItems ?? null,
    groupCriteriaId: criteriaId,
    completionCriteria: dropshippingProduct.completionCriteria ?? null,
    groupCriteriaName: criteriaRelation?.name ?? null,
  };
};

const mapOngoingGroupRequestResponse = (item: Record<string, any>) => ({
  ...item,
  directOrderProduct:
    item.product?.directOrderProduct && item.product.directOrderProduct.productId != null
      ? {
          id: item.product.directOrderProduct.id,
          productId: item.product.directOrderProduct.productId,
          directOrderCode: item.product.directOrderProduct.directOrderCode,
        }
      : null,
  dropshippingProduct: mapDropshippingProductResponse(item.product?.dropshippingProduct),
});

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
      data: result.data.map(mapOngoingGroupRequestResponse),
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
  const user = c.get("user");

  await service.deleteOngoingGroupRequest(id, user.id);

  return c.json(
    {
      success: true,
      message: STANDARD_MESSAGES.SUCCESS.DELETED,
      data: null,
    },
    HttpStatusCodes.OK,
  );
};

export const adminCancel: AppRouteHandler<AdminCancelRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const cancelled = await service.adminCancelOngoingGroupRequest(id, user.id);

  return c.json(
    successResponse<OngoingGroupRequestResponse>(
      cancelled,
      "Groupage slot cancelled by admin",
    ),
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

export const approveGroup: AppRouteHandler<ApproveGroupRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const result = await service.approveOngoingGroupByRequestId(id, user.id);

  return c.json(
    successResponse(result, "Ongoing group approved and customers notified"),
    HttpStatusCodes.OK,
  );
};

export const rejectGroup: AppRouteHandler<RejectGroupRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { reasonForRejection } = c.req.valid("json");
  const user = c.get("user");

  const result = await service.rejectOngoingGroupByRequestId(
    id,
    user.id,
    reasonForRejection,
  );

  return c.json(
    successResponse(result, "Ongoing group rejected and customers notified"),
    HttpStatusCodes.OK,
  );
};

export const adminGroups: AppRouteHandler<AdminGroupsRoute> = async (c) => {
  const query = c.req.valid("query");
  const result = await service.listAdminOngoingGroups(query);
  return c.json(result, HttpStatusCodes.OK);
};

export const adminGroupById: AppRouteHandler<AdminGroupByIdRoute> = async (c) => {
  const { ongoingGroupId } = c.req.valid("param");
  const result = await service.getAdminOngoingGroupById(ongoingGroupId);
  return c.json(
    successResponse(result, STANDARD_MESSAGES.SUCCESS.FETCHED),
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
    requests: result.requests.map(mapOngoingGroupRequestResponse),
  }, HttpStatusCodes.OK);
};

export const productSummary: AppRouteHandler<ProductSummaryRoute> = async (c) => {
  const { productId } = c.req.valid("param");
  const { color } = c.req.valid("query");
  const user = c.get("user");
  const result = await service.getProductGroupageSummary(productId, user.id, color);
  return c.json(result, HttpStatusCodes.OK);
};

export const activeColorGroups: AppRouteHandler<ActiveColorGroupsRoute> = async (c) => {
  const user = c.get("user");
  const result = await service.listActiveOngoingColorGroups(user.id);
  return c.json(result, HttpStatusCodes.OK);
};
