import type {
  CreateOngoingGroupRequest,
} from "./ongoing-groups.schema";

import { eq } from "drizzle-orm";
import { GroupApprovalStatusIds } from "@/constants/group-approval-statuses.constants";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import { groupApprovalStatuses, ongoingGroups, products, variants } from "@/db/models";

import { OngoingGroupRequestsRepository } from "./ongoing-groups.repository";

export class OngoingGroupRequestsService {
  private readonly repository: OngoingGroupRequestsRepository;

  constructor() {
    this.repository = new OngoingGroupRequestsRepository();
  }

  /**
   * Create a new ongoing group request
   * This is the main business logic: user requests a specific product variant
   */
  async createOngoingGroupRequest(
    requestData: CreateOngoingGroupRequest & { requestedBy: number; createdBy: number },
  ) {
    // Validate that product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, requestData.productId),
    });
    if (!product) {
      throw new AppError("Product not found");
    }

    // Validate that variant exists
    const variant = await db.query.variants.findFirst({
      where: eq(variants.id, requestData.variantId),
    });
    if (!variant) {
      throw new AppError("Product variant not found");
    }

    // Validate that variant belongs to the product
    if (variant.productId !== requestData.productId) {
      throw new AppError("Variant does not belong to the specified product");
    }

    // Check concurrent requests limit
    const limitCheck = await this.repository.checkConcurrentRequestsLimit(
      requestData.productId,
    );
    if (!limitCheck.canCreate) {
      throw new AppError(
        `Product has reached the maximum concurrent requests limit (${limitCheck.currentRequests}/${limitCheck.limit})`,
      );
    }

    const request = await db.transaction(async (tx) => {
      // Find or create ongoing group for this product
      const group = await this.repository.findOrCreateOngoingGroup(
        requestData.productId,
        requestData.quantity,
        tx,
      );

      // Create the request
      return this.repository.create(tx, {
        ...requestData,
        ongoingGroupId: group.id,
        approvalStatusId: requestData.approvalStatusId || 1, // Default to pending
        createdBy: requestData.createdBy,
        updatedBy: requestData.createdBy,
      });
    });

    return this.repository.findById(request.id);
  }

  /**
   * List ongoing group requests with pagination, filtering, and sorting
   */
  async listOngoingGroupRequests(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const result = await this.repository.list(params);

    return {
      ...result,
      searchableFields: ["reasonForRejection"],
    };
  }

  /**
   * Get ongoing group request by ID
   */
  async getOngoingGroupRequestById(id: number) {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundError("Ongoing group request not found");
    }
    return request;
  }

  /**
   * Update an ongoing group request (e.g., approve, reject, change status)
   */
  async updateOngoingGroupRequest(
    id: number,
    requestData: { approvalStatusId: number; reasonForRejection?: string; updatedBy: number },
  ) {
    // Check if request exists
    const existingRequest = await this.repository.findById(id);
    if (!existingRequest) {
      throw new NotFoundError("Ongoing group request not found");
    }

    // Validate that approval status exists if being updated
    if (requestData.approvalStatusId) {
      const status = await db.query.groupApprovalStatuses.findFirst({
        where: eq(groupApprovalStatuses.id, requestData.approvalStatusId),
      });
      if (!status) {
        throw new AppError("Approval status not found");
      }
    }

    await db.transaction(async (tx) => {
      await this.repository.update(tx, id, requestData);
    });

    return this.repository.findById(id);
  }

  /**
   * Delete an ongoing group request
   */
  async deleteOngoingGroupRequest(id: number) {
    // Check if request exists
    const existingRequest = await this.repository.findById(id);
    if (!existingRequest) {
      throw new NotFoundError("Ongoing group request not found");
    }

    await db.transaction(async (tx) => {
      await this.repository.delete(tx, id);
    });
  }

  /**
   * Get requests by ongoing group ID
   */
  async getRequestsByOngoingGroupId(ongoingGroupId: number) {
    return this.repository.findByOngoingGroupId(ongoingGroupId);
  }

  /**
   * Check concurrent requests limit for a product
   */
  async checkConcurrentRequestsLimit(productId: number) {
    return this.repository.checkConcurrentRequestsLimit(productId);
  }

  /**
   * Approve a request
   */
  async approveRequest(id: number, approvedBy: number) {
    const request = await this.updateOngoingGroupRequest(id, {
      approvalStatusId: GroupApprovalStatusIds.APPROVED,
      updatedBy: approvedBy,
    });
    if (!request) {
      throw new AppError("Failed to update request");
    }

    // Update the ongoing group with approval details
    await db.transaction(async (tx) => {
      await tx
        .update(ongoingGroups)
        .set({
          approvalDate: new Date().toISOString().split("T")[0], // Date only
          approvedBy,
          updatedBy: approvedBy,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ongoingGroups.id, request.ongoingGroupId));
    });

    return request;
  }

  /**
   * Reject a request
   */
  async rejectRequest(id: number, rejectedBy: number, reason: string) {
    const request = await this.updateOngoingGroupRequest(id, {
      approvalStatusId: GroupApprovalStatusIds.REJECTED,
      reasonForRejection: reason,
      updatedBy: rejectedBy,
    });
    if (!request) {
      throw new AppError("Failed to update request");
    }

    // Update the ongoing group with rejection details
    await db.transaction(async (tx) => {
      await tx
        .update(ongoingGroups)
        .set({
          rejectionDate: new Date().toISOString().split("T")[0], // Date only
          rejectedBy,
          reasonForRejection: reason,
          updatedBy: rejectedBy,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ongoingGroups.id, request.ongoingGroupId));
    });

    return request;
  }

  /**
   * Undo approval or rejection - revert to pending status
   */
  async undoRequest(id: number, undoneBy: number) {
    // Check if request exists
    const existingRequest = await this.repository.findById(id);
    if (!existingRequest) {
      throw new NotFoundError("Ongoing group request not found");
    }

    // Check if request is currently approved or rejected
    if (existingRequest.approvalStatusId === GroupApprovalStatusIds.PENDING) {
      throw new AppError("Request is already in pending status");
    }

    await db.transaction(async (tx) => {
      // Update the request to pending status and clear rejection reason
      await this.repository.update(tx, id, {
        approvalStatusId: GroupApprovalStatusIds.PENDING,
        reasonForRejection: undefined,
        updatedBy: undoneBy,
      });

      // Clear approval/rejection details from ongoing group
      await tx
        .update(ongoingGroups)
        .set({
          approvalDate: null,
          approvedBy: null,
          rejectionDate: null,
          rejectedBy: null,
          reasonForRejection: null,
          updatedBy: undoneBy,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ongoingGroups.id, existingRequest.ongoingGroupId));
    });

    return this.repository.findById(id);
  }

  /**
   * List all ongoing groups and requests for a user (simple version)
   */
  async listOngoingRequestsByUser(userId: number) {
    const requests = await this.repository.list({
      page: 1,
      limit: 1000, // large enough to get all
      filters: { requestedBy: userId },
    });
    return {
      requests: requests.data,
    };
  }
}
