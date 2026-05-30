export enum StoreNames {
  DIRECT = "Direct Order Store",
  DROPSHIPPING = "Dropship Store",
  ONLINE_STORE = "Online Store",
}

/**
 * Numeric IDs for stores
 */
export const StoreIds: Record<string, number> = {
  direct: 1,
  dropshipping: 2,
};

export const STORES = [
  {
    id: StoreIds.direct,
    name: StoreNames.DIRECT,
    description: "Our flagship store located downtown.",
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  },
  {
    id: StoreIds.dropshipping,
    name: StoreNames.DROPSHIPPING,
    description: "Small outlet in the shopping mall.",
    createdBy: 1,
    updatedBy: 1,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  },
];
