import type {
  UpdateOngoingGroupRequest,
} from "./ongoing-groups.schema";

import type { NewOngoingGroupRequests } from "@/db/models/ongoing-group-requests";
import type { TX } from "@/lib/types";

import { and, count, desc, eq } from "drizzle-orm";
import db from "@/db";
import {
  dropshippingProducts,
  ongoingGroupRequests,
  ongoingGroups,
  products,
} from "@/db/models";

import {
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for ongoing group requests-related database operations
 */
export class OngoingGroupRequestsRepository {
  /**
   * Find an ongoing group request by ID
   *
   * @param id - Ongoing group request ID
   * @param tx - Optional transaction object
   * @returns The ongoing group request object or null if not found
   */
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    const request = await queryBuilder.query.ongoingGroupRequests.findFirst({
      where: eq(ongoingGroupRequests.id, id),
      with: {
        ongoingGroup: true,
        product: {
          with: {
            directOrderProduct: true,
            dropshippingProduct: true,
          },
        },
        variant: true,
        approvalStatus: true,
        requestedBy: {
          columns: {
            id: true,
            username: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            username: true,
          },
        },
        updatedBy: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    return request;
  }

  /**
   * List ongoing group requests with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @param params.filters.productId - Product ID to filter by
   * @param params.filters.variantId - Variant ID to filter by
   * @param params.filters.approvalStatusId - Approval status ID to filter by
   * @param params.filters.requestedBy - User ID who made the request
   * @returns List of ongoing group requests and total count
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      productId?: number;
      variantId?: number;
      approvalStatusId?: number;
      requestedBy?: number;
      [key: string]: any;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["reasonForRejection"];

    const whereConditions = [];

    // Add filters
    if (filters?.productId) {
      whereConditions.push(eq(ongoingGroupRequests.productId, filters.productId));
    }

    if (filters?.variantId) {
      whereConditions.push(eq(ongoingGroupRequests.variantId, filters.variantId));
    }

    if (filters?.approvalStatusId) {
      whereConditions.push(eq(ongoingGroupRequests.approvalStatusId, filters.approvalStatusId));
    }

    if (filters?.requestedBy) {
      whereConditions.push(eq(ongoingGroupRequests.requestedBy, filters.requestedBy));
    }

    // Add search condition
    const searchCondition = createSearchCondition(
      searchableFields,
      ongoingGroupRequests,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(ongoingGroupRequests)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    // Get pagination values
    const { offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(ongoingGroupRequests, sortBy, sortOrder);

    // Get data
    const requests = await db.query.ongoingGroupRequests.findMany({
      where: whereClause,
      with: {
        ongoingGroup: true,
        product: {
          with: {
            directOrderProduct: true,
            dropshippingProduct: true,
          },
        },
        variant: true,
        approvalStatus: true,
        requestedBy: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: sortCondition || [desc(ongoingGroupRequests.createdAt)],
      limit,
      offset,
    });

    return {
      data: requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Create a new ongoing group request
   *
   * @param tx - Transaction object
   * @param requestData - Ongoing group request data
   * @returns The created ongoing group request
   */
  async create(tx: TX, requestData: NewOngoingGroupRequests) {
    const [request] = await tx.insert(ongoingGroupRequests).values(requestData).returning();
    return request;
  }

  /**
   * Update an ongoing group request
   *
   * @param tx - Transaction object
   * @param id - Ongoing group request ID
   * @param requestData - Updated ongoing group request data
   * @returns The updated ongoing group request
   */
  async update(
    tx: TX,
    id: number,
    requestData: UpdateOngoingGroupRequest & { updatedBy: number },
  ) {
    const [request] = await tx
      .update(ongoingGroupRequests)
      .set({
        ...requestData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ongoingGroupRequests.id, id))
      .returning();
    return request;
  }

  /**
   * Delete an ongoing group request
   *
   * @param tx - Transaction object
   * @param id - Ongoing group request ID
   */
  async delete(tx: TX, id: number) {
    await tx.delete(ongoingGroupRequests).where(eq(ongoingGroupRequests.id, id));
  }

  /**
   * Find or create ongoing group for a product
   *
   * @param productId - Product ID
   * @param quantity - Number of items requested
   * @param tx - Transaction object
   * @returns The ongoing group
   */
  async findOrCreateOngoingGroup(productId: number, quantity: number, tx: TX) {
    // Get product's total items and completion criteria from dropshipping products
    const dropshippingProduct = await tx.query.dropshippingProducts.findFirst({
      where: eq(dropshippingProducts.productId, productId),
    });

    const totalItems = dropshippingProduct?.totalItems || 0;
    if (dropshippingProduct?.completionCriteria == null) {
      throw new Error("completionCriteria must be set for this product in dropshipping_products.");
    }
    const thresholdToValidate = Math.floor(Number(dropshippingProduct.completionCriteria));

    // Try to find existing ongoing group for this product
    let group = await tx.query.ongoingGroups.findFirst({
      where: eq(ongoingGroups.productId, productId),
    });

    // If no group exists, create one
    if (!group) {
      const [newGroup] = await tx.insert(ongoingGroups).values({
        productId,
        orderedItems: quantity, // Start with this request's quantity
        totalItems,
        thresholdToValidate,
        statusId: 1, // Default to pending status
        createdBy: 1, // System user
        updatedBy: 1,
      }).returning();
      group = newGroup;
    } else {
      // Update orderedItems by adding this request's quantity
      await tx
        .update(ongoingGroups)
        .set({
          orderedItems: group.orderedItems + quantity,
          totalItems,
          thresholdToValidate, // Update threshold in case it changed
          updatedAt: new Date().toISOString(),
        })
        .where(eq(ongoingGroups.id, group.id));

      group.orderedItems = group.orderedItems + quantity;
      group.totalItems = totalItems;
      group.thresholdToValidate = thresholdToValidate;
    }

    return group;
  }

  /**
   * Check concurrent requests limit for a product
   *
   * @param productId - Product ID
   * @param tx - Optional transaction object
   * @returns Object with current requests count and limit
   */
  async checkConcurrentRequestsLimit(productId: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    // Get product's concurrent requests limit
    const product = await queryBuilder.query.products.findFirst({
      where: eq(products.id, productId),
      columns: {
        concurrentReqs: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Count current ongoing group requests for this product
    const currentRequestsResult = await queryBuilder
      .select({ count: count() })
      .from(ongoingGroupRequests)
      .where(eq(ongoingGroupRequests.productId, productId));

    const currentRequests = currentRequestsResult[0]?.count || 0;

    if (!product.concurrentReqs) {
      throw new Error("Product concurrent requests limit is not set");
    }

    const limit = product.concurrentReqs;

    return {
      currentRequests,
      limit,
      canCreate: currentRequests < limit,
    };
  }

  /**
   * Get requests by ongoing group ID
   *
   * @param ongoingGroupId - Ongoing group ID
   * @param tx - Optional transaction object
   * @returns Array of requests for the group
   */
  async findByOngoingGroupId(ongoingGroupId: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    return queryBuilder.query.ongoingGroupRequests.findMany({
      where: eq(ongoingGroupRequests.ongoingGroupId, ongoingGroupId),
      with: {
        product: true,
        variant: true,
        approvalStatus: true,
        requestedBy: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: desc(ongoingGroupRequests.createdAt),
    });
  }

  /**
   * Update ongoing group with approval details
   *
   * @param ongoingGroupId - Ongoing group ID
   * @param approvedBy - User ID who approved
   * @param tx - Transaction object
   */
  async updateOngoingGroupApproval(
    ongoingGroupId: number,
    approvedBy: number,
    tx: TX,
  ) {
    await tx
      .update(ongoingGroups)
      .set({
        approvalDate: new Date().toISOString().split("T")[0], // Date only
        approvedBy,
        updatedBy: approvedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ongoingGroups.id, ongoingGroupId));
  }

  /**
   * Update ongoing group with rejection details
   *
   * @param ongoingGroupId - Ongoing group ID
   * @param rejectedBy - User ID who rejected
   * @param reason - Reason for rejection
   * @param tx - Transaction object
   */
  async updateOngoingGroupRejection(
    ongoingGroupId: number,
    rejectedBy: number,
    reason: string,
    tx: TX,
  ) {
    await tx
      .update(ongoingGroups)
      .set({
        rejectionDate: new Date().toISOString().split("T")[0], // Date only
        rejectedBy,
        reasonForRejection: reason,
        updatedBy: rejectedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ongoingGroups.id, ongoingGroupId));
  }
}
