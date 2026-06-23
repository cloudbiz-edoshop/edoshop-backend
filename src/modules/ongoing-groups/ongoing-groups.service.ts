import type {
  CreateOngoingGroupRequest,
} from "./ongoing-groups.schema";

import { and, eq, ne } from "drizzle-orm";
import { GroupApprovalStatusIds } from "@/constants/group-approval-statuses.constants";
import { NotificationFrequencyIds } from "@/constants/notification-frequencies.constants";
import { NotificationTypeIds } from "@/constants/notification-types.constants";
import { RecipientTypeIds } from "@/constants/recipient-types.constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import { groupApprovalStatuses, notifications, ongoingGroupRequests, ongoingGroups, products, users, variants } from "@/db/models";
import sendWhatsapp from "@/lib/send-whatsapp";

import { OngoingGroupRequestsRepository } from "./ongoing-groups.repository";

const REQUEST_CANCEL_WINDOW_HOURS = 24;
const SYSTEM_USER_ID = 1;

export class OngoingGroupRequestsService {
  private readonly repository: OngoingGroupRequestsRepository;

  constructor() {
    this.repository = new OngoingGroupRequestsRepository();
  }

  private isWithinCancelWindow(createdAt?: string | null) {
    if (!createdAt) return true;
    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return true;
    return Date.now() - createdTime <= REQUEST_CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
  }

  private async createSystemNotification(data: {
    title: string;
    message: string;
    notificationTypeId: number;
    recipientTypeId: number;
    createdBy?: number;
  }) {
    await db.insert(notifications).values({
      title: data.title,
      message: data.message.slice(0, 255),
      notificationTypeId: data.notificationTypeId,
      notificationFrequencyId: NotificationFrequencyIds.ONE_TIME,
      recipientTypeId: data.recipientTypeId,
      status: "pending",
      createdBy: data.createdBy ?? SYSTEM_USER_ID,
      updatedBy: data.createdBy ?? SYSTEM_USER_ID,
    });
  }

  private async notifyAdminsGroupReady(groupId: number, productName: string, createdBy: number) {
    await this.createSystemNotification({
      title: "Groupage ready for approval",
      message: `${productName} groupage is complete and ready for Edoshop approval.`,
      notificationTypeId: NotificationTypeIds.GROUPAGE_ALMOST_CLOSING,
      recipientTypeId: RecipientTypeIds.ONGOING_GROUPS,
      createdBy,
    });
  }

  private async notifyCustomerRequestApproved(request: any, approvedBy: number) {
    const requestedById = typeof request.requestedBy === "object"
      ? request.requestedBy?.id
      : request.requestedBy;
    if (!requestedById) return;

    const requestedByUser = await db.query.users.findFirst({
      where: eq(users.id, requestedById),
    });
    const productName = request.product?.name || "Your groupage item";
    const message = `${productName} has been approved. Please proceed with payment in Edoshop.`;

    await this.createSystemNotification({
      title: "Groupage approved - proceed with payment",
      message,
      notificationTypeId: NotificationTypeIds.REQUEST_APPROVED,
      recipientTypeId: RecipientTypeIds.REQUEST_APPROVED_CHECKOUT_DELAYING,
      createdBy: approvedBy,
    });

    if (requestedByUser?.phoneNumber) {
      try {
        await sendWhatsapp({
          phoneNumber: requestedByUser.phoneNumber,
          message,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to send groupage approval WhatsApp notification", error);
      }
    }
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

    const existingActiveVariantRequest = await db.query.ongoingGroupRequests.findFirst({
      where: and(
        eq(ongoingGroupRequests.productId, requestData.productId),
        eq(ongoingGroupRequests.variantId, requestData.variantId),
        ne(ongoingGroupRequests.approvalStatusId, GroupApprovalStatusIds.REJECTED),
      ),
    });
    if (existingActiveVariantRequest) {
      if (existingActiveVariantRequest.requestedBy === requestData.requestedBy) {
        throw new ValidationError("You have already requested this groupage slot");
      }
      throw new ValidationError("This groupage slot is already selected. Please choose another open slot");
    }

    // Check distinct open variant limit. Existing open variants can fill, but new
    // variants cannot exceed the admin-configured product.concurrentReqs limit.
    const limitCheck = await this.repository.checkConcurrentRequestsLimit(
      requestData.productId,
      requestData.variantId,
    );
    if (!limitCheck.canCreate) {
      throw new ValidationError(
        `At this moment, we cannot open another variant for this item. Please choose among the ${limitCheck.limit} variants already open.`,
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
      } as any);
    });

    const createdRequest = await this.repository.findById(request.id);
    if (
      createdRequest?.ongoingGroup &&
      createdRequest.ongoingGroup.orderedItems >= createdRequest.ongoingGroup.thresholdToValidate &&
      createdRequest.ongoingGroup.orderedItems - createdRequest.quantity < createdRequest.ongoingGroup.thresholdToValidate
    ) {
      await this.notifyAdminsGroupReady(
        createdRequest.ongoingGroup.id,
        product.name,
        requestData.createdBy,
      );
    }

    return createdRequest;
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

    const updatedRequest = await this.repository.findById(id);
    if (
      updatedRequest &&
      requestData.approvalStatusId === GroupApprovalStatusIds.APPROVED &&
      existingRequest.approvalStatusId !== GroupApprovalStatusIds.APPROVED
    ) {
      await this.notifyCustomerRequestApproved(updatedRequest, requestData.updatedBy);
    }

    return updatedRequest;
  }

  /**
   * Delete an ongoing group request
   */
  async deleteOngoingGroupRequest(id: number, userId: number) {
    // Check if request exists
    const existingRequest = await this.repository.findById(id);
    if (!existingRequest) {
      throw new NotFoundError("Ongoing group request not found");
    }
    const requestedBy = existingRequest.requestedBy as any;
    const requestedById = typeof requestedBy === "object"
      ? requestedBy?.id
      : requestedBy;
    if (requestedById !== userId) {
      throw new AppError("You can only cancel your own groupage request");
    }
    if (!this.isWithinCancelWindow(existingRequest.createdAt)) {
      throw new AppError("This request is confirmed. Please contact Edoshop to remove it.");
    }

    await db.transaction(async (tx) => {
      await this.repository.delete(tx, id);
      await tx
        .update(ongoingGroups)
        .set({
          orderedItems: Math.max(
            0,
            (existingRequest.ongoingGroup?.orderedItems ?? 0) - existingRequest.quantity,
          ),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        } as any)
        .where(eq(ongoingGroups.id, existingRequest.ongoingGroupId));
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

  async getProductGroupageSummary(productId: number, userId: number) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const group = await db.query.ongoingGroups.findFirst({
      where: eq(ongoingGroups.productId, productId),
    });

    const productVariants = await db.query.variants.findMany({
      where: eq(variants.productId, productId),
      with: {
        color: true,
        size: true,
      },
    });

    const requests = await db.query.ongoingGroupRequests.findMany({
      where: and(
        eq(ongoingGroupRequests.productId, productId),
        ne(ongoingGroupRequests.approvalStatusId, GroupApprovalStatusIds.REJECTED),
      ),
      with: {
        approvalStatus: true,
      },
    });

    const requestsByVariant = requests.reduce((acc, request) => {
      const current = acc.get(request.variantId) ?? {
        requestedQuantity: 0,
        isMine: false,
        status: request.approvalStatus?.name ?? null,
      };
      current.requestedQuantity += request.quantity;
      current.isMine = current.isMine || request.requestedBy === userId;
      current.status = request.approvalStatus?.name ?? current.status;
      acc.set(request.variantId, current);
      return acc;
    }, new Map<number, { requestedQuantity: number; isMine: boolean; status: string | null }>());

    const totalItems = group?.totalItems || productVariants.length || 0;
    const orderedItems = group?.orderedItems || requests.reduce((sum, request) => sum + request.quantity, 0);
    const completionRate = totalItems > 0
      ? Math.min(100, Math.round((orderedItems / totalItems) * 100))
      : 0;

    return {
      productId,
      group: group
        ? {
            id: group.id,
            orderedItems,
            totalItems,
            thresholdToValidate: group.thresholdToValidate,
            statusId: group.statusId,
            completionRate,
            isReadyForApproval: orderedItems >= group.thresholdToValidate,
          }
        : null,
      slots: productVariants.map((variant) => {
        const slotRequest = requestsByVariant.get(variant.id);
        return {
          variantId: variant.id,
          variantCode: variant.variantCode,
          size: variant.size?.description || variant.size?.name || null,
          color: variant.color?.description || variant.color?.name || null,
          requestedQuantity: slotRequest?.requestedQuantity ?? 0,
          isFilled: Boolean(slotRequest?.requestedQuantity),
          isMine: Boolean(slotRequest?.isMine),
          status: slotRequest?.status ?? null,
        };
      }),
    };
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

  async approveOngoingGroupByRequestId(requestId: number, approvedBy: number) {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundError("Ongoing group request not found");
    }
    if (!request.ongoingGroupId || !request.ongoingGroup) {
      throw new AppError("Ongoing group not found for this request");
    }

    const groupRequests = await this.repository.findByOngoingGroupId(request.ongoingGroupId);
    const requestsToApprove = groupRequests.filter(
      (groupRequest) =>
        groupRequest.approvalStatusId !== GroupApprovalStatusIds.APPROVED &&
        groupRequest.approvalStatusId !== GroupApprovalStatusIds.REJECTED,
    );

    if (!requestsToApprove.length) {
      return {
        ongoingGroupId: request.ongoingGroupId,
        approvedCount: 0,
      };
    }

    await db.transaction(async (tx) => {
      for (const groupRequest of requestsToApprove) {
        await this.repository.update(tx, groupRequest.id, {
          approvalStatusId: GroupApprovalStatusIds.APPROVED,
          updatedBy: approvedBy,
        });
      }

      await this.repository.updateOngoingGroupApproval(
        request.ongoingGroupId,
        approvedBy,
        tx,
      );
    });

    const approvedRequests = await this.repository.findByOngoingGroupId(request.ongoingGroupId);
    const newlyApprovedIds = new Set(requestsToApprove.map((groupRequest) => groupRequest.id));

    await Promise.all(
      approvedRequests
        .filter((groupRequest) => newlyApprovedIds.has(groupRequest.id))
        .map((groupRequest) =>
          this.notifyCustomerRequestApproved(groupRequest, approvedBy),
        ),
    );

    return {
      ongoingGroupId: request.ongoingGroupId,
      approvedCount: requestsToApprove.length,
    };
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
