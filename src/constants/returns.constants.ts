/**
 * Seed data for the `returns` table
 * This links return entries to their original entries and customers
 */
export const RETURNS_DATA = [
  {
    entryId: 10, // Return entry ID (SERIES entry with RETURNED state)
    entryType: "SERIES",
    originalEntryId: 6, // Original SERIES entry ID that was returned
    customerId: 1, // Customer who made the return
    isOpen: true, // Return is still being processed
    orderId: "ORD_001", // Optional order reference
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: 15, // Return entry ID (ITEM entry with RETURNED state)
    entryType: "ITEM",
    originalEntryId: 11, // Original ITEM entry ID that was returned
    customerId: 2, // Customer who made the return
    isOpen: false, // Return has been processed
    orderId: "ORD_002", // Optional order reference
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
];
