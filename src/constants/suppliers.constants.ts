/**
 * Sample suppliers data for seeding
 */
export const SUPPLIERS_DATA = [
  {
    userId: 1,
    storeName: "Alpha Supplies",
    supplierCode: "PK_A01",
    entryTypeId: 1,
    paymentMethodId: 1,
    bankAccountName: "Alpha Bank",
    bankAccountNumber: "1234567890",
    isActive: true,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    userId: 2,
    storeName: "Beta Distributors",
    supplierCode: "PK_A02",
    entryTypeId: 2,
    paymentMethodId: 2,
    bankAccountName: "Beta Bank",
    bankAccountNumber: "9876543210",
    isActive: true,
    createdBy: 2,
    updatedBy: 2,
  },
  {
    userId: 3,
    storeName: "Gamma Traders",
    supplierCode: "PK_A03",
    entryTypeId: 1,
    paymentMethodId: 1,
    bankAccountName: "Gamma Bank",
    bankAccountNumber: "1122334455",
    isActive: false,
    createdBy: 3,
    updatedBy: 3,
    deletedBy: 3,
    deletedAt: new Date().toISOString(),
    isDeleted: true,
  },
];
