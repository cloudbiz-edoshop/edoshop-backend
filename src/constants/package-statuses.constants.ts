export enum PACKAGE_STATUSES {
  CREATED = "Created",
  PACKED = "Packed",
  PENDING = "Pending",
  READY_TO_DISPATCH = "Ready to Dispatch",
  DISPATCHED = "Dispatched",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  RETURNED = "Returned",
  CANCELLED = "Cancelled",

}

export const PackageStatusIds = {
  CREATED: 1,
  PACKED: 2,
  PENDING: 3,
  READY_TO_DISPATCH: 4,
  DISPATCHED: 5,
  SHIPPED: 6,
  DELIVERED: 7,
  RETURNED: 8,
  CANCELLED: 9,

};

/**
 * Provides descriptions for package statuses
 */

export const PACKAGE_STATUSES_DESCRIPTIONS: Record<PACKAGE_STATUSES, string> = {
  [PACKAGE_STATUSES.CREATED]: "Package has been created.",
  [PACKAGE_STATUSES.PACKED]: "Package has been packed.",
  [PACKAGE_STATUSES.PENDING]: "Package is awaiting processing.",
  [PACKAGE_STATUSES.READY_TO_DISPATCH]: "Package is ready for dispatch to the carrier.",
  [PACKAGE_STATUSES.DISPATCHED]: "Package has been dispatched to the carrier.",
  [PACKAGE_STATUSES.SHIPPED]: "Package has been shipped.",
  [PACKAGE_STATUSES.DELIVERED]: "Package has been delivered to the customer.",
  [PACKAGE_STATUSES.RETURNED]: "Package was returned by the customer or carrier.",
  [PACKAGE_STATUSES.CANCELLED]: "Package shipment was cancelled.",

};

export const PackageStatusIdToEnum: Record<number, PACKAGE_STATUSES> = {
  1: PACKAGE_STATUSES.CREATED,
  2: PACKAGE_STATUSES.PACKED,
  3: PACKAGE_STATUSES.PENDING,
  4: PACKAGE_STATUSES.READY_TO_DISPATCH,
  5: PACKAGE_STATUSES.DISPATCHED,
  6: PACKAGE_STATUSES.SHIPPED,
  7: PACKAGE_STATUSES.DELIVERED,
  8: PACKAGE_STATUSES.RETURNED,
  9: PACKAGE_STATUSES.CANCELLED,
};
