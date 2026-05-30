/**
 * Review statuses available in the application
 * Using enum for better type safety and autocompletion
 */
export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const ReviewStatusIds = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

/**
 * Provides descriptions for review statuses
 */
export const REVIEW_STATUS_DESCRIPTIONS: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "Pending Review",
  [ReviewStatus.APPROVED]: "Approved",
  [ReviewStatus.REJECTED]: "Rejected",
};
