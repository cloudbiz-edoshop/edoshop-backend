import type { Database } from "@/db";

import { eq } from "drizzle-orm";

import { ONGOING_GROUPS } from "@/constants/ongoing-groups.constants";

import { dropshippingProducts, ongoingGroups as ongoingGroupsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Create ongoing groups based on constants
  const ongoingGroupsData = await Promise.all(
    ONGOING_GROUPS.map(async (ongoingGroupConfig) => {
      // Get dropshipping product data for this productId
      const dropshippingProduct = await db.query.dropshippingProducts.findFirst({
        where: eq(dropshippingProducts.productId, ongoingGroupConfig.productId),
      });

      if (!dropshippingProduct) {
        throw new Error(
          `Dropshipping product with productId ${ongoingGroupConfig.productId} not found`,
        );
      }

      const totalItems = dropshippingProduct.totalItems || 0;
      const completionCriteria = dropshippingProduct.completionCriteria
        ? Number(dropshippingProduct.completionCriteria)
        : 0;
      const thresholdToValidate = Math.floor(completionCriteria);

      return {
        productId: ongoingGroupConfig.productId,
        orderedItems: 0, // Start with 0, gets updated when requests are made
        totalItems,
        thresholdToValidate,
        statusId: ongoingGroupConfig.statusId,
        approvalDate: null,
        approvedBy: null,
        reasonForRejection: null,
        rejectionDate: null,
        rejectedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: ongoingGroupConfig.createdBy,
        updatedBy: ongoingGroupConfig.updatedBy,
      };
    }),
  );

  // Insert ongoing groups in chunks
  for (let i = 0; i < ongoingGroupsData.length; i += CHUNK_SIZE) {
    const chunk = ongoingGroupsData.slice(i, i + CHUNK_SIZE);
    await db.insert(ongoingGroupsTable).values(chunk);
  }
}
