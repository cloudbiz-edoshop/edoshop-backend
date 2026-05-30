export enum PAYMENT_STATUSES {
  PENDING = "Pending",
  COMPLETED = "Completed",
  FAILED = "Failed",
  REFUNDED = "Refunded",
  CANCELLED = "Cancelled",
}

export const PAYMENT_STATUSES_DESCRIPTIONS: Record<PAYMENT_STATUSES, string> = {
  [PAYMENT_STATUSES.PENDING]: "The payment is pending and awaiting confirmation.",
  [PAYMENT_STATUSES.COMPLETED]: "The payment has been successfully completed.",
  [PAYMENT_STATUSES.FAILED]: "The payment has failed. Please try again.",
  [PAYMENT_STATUSES.REFUNDED]: "The payment has been refunded to the customer.",
  [PAYMENT_STATUSES.CANCELLED]: "The payment has been cancelled by the user or system.",
};
