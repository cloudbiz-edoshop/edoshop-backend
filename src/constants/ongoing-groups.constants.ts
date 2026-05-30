import { GroupApprovalStatusIds } from "./group-approval-statuses.constants";

/**
 * Ongoing groups seed data
 * Only dropshipping products have ongoing groups
 * productId references products.id in the database
 * Based on PRODUCTS array: Denim Jacket (3), Summer Dress (4), Leather Bag (5), Smart Watch (6)
 * orderedItems will be 0 by default (database default) and gets updated when requests are made
 */
export interface OngoingGroupSeedData {
  productId: number; // Foreign key to products.id
  statusId: number; // Group approval status ID
  createdBy: number;
  updatedBy: number;
}

/**
 * Default ongoing groups for dropshipping products
 * These will be created for each dropshipping product during seeding
 */
export const ONGOING_GROUPS: OngoingGroupSeedData[] = [
  {
    productId: 3, // Denim Jacket
    statusId: GroupApprovalStatusIds.PENDING,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    productId: 4, // Summer Dress
    statusId: GroupApprovalStatusIds.PENDING,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    productId: 5, // Leather Bag
    statusId: GroupApprovalStatusIds.PENDING,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    productId: 6, // Smart Watch
    statusId: GroupApprovalStatusIds.PENDING,
    createdBy: 1,
    updatedBy: 1,
  },
];
