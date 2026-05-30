/**
 * Transfer statuses available in the application
 * Using enum for better type safety and autocompletion
 */
export enum TransferStatus {
  SENT = "sent",
  UNDONE = "undone",
  RECEIVED = "received",
  BIN_LOCATION_ASSIGNED = "bin location assigned",
}

export const TransferStatusIds = {
  SENT: 1,
  UNDONE: 2,
  RECEIVED: 3,
  BIN_LOCATION_ASSIGNED: 4,
} as const;

/**
 * Provides descriptions for transfer statuses
 */
export const TRANSFER_STATUS_DESCRIPTIONS: Record<TransferStatus, string> = {
  [TransferStatus.SENT]: "Transfer has been Sent",
  [TransferStatus.UNDONE]: "Transfer has been undone",
  [TransferStatus.RECEIVED]: "Transfer has been received",
  [TransferStatus.BIN_LOCATION_ASSIGNED]: "Bin location has been assigned",
};

export type TransferStatusId =
  (typeof TransferStatusIds)[keyof typeof TransferStatusIds];
