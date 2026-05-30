/**
 * Group approval statuses available in the application
 * Using enum for better type safety and autocompletion
 */
export enum GroupApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const GroupApprovalStatusIds = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

/**
 * Provides descriptions for group approval statuses
 */
export const GROUP_APPROVAL_STATUS_DESCRIPTIONS: Record<GroupApprovalStatus, string> = {
  [GroupApprovalStatus.PENDING]: "Request is pending approval",
  [GroupApprovalStatus.APPROVED]: "Request has been approved",
  [GroupApprovalStatus.REJECTED]: "Request has been rejected",
};
