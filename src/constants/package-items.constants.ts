// Sample package items data showing partial fulfillment scenarios
// This connects packages to order items with quantities

export const PACKAGE_ITEMS_DATA = [
  // Package 1 (PKG_01) - Contains items from order 1
  {
    packageId: 1,
    orderItemId: 1, // Sport Shoes (quantity: 1)
    quantityPacked: 1, // Fully packed
    version: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    packageId: 1,
    orderItemId: 2, // Summer Dress (quantity: 2)
    quantityPacked: 1, // Partially packed (only 1 of 2)
    version: 1,
    createdBy: 1,
    updatedBy: 1,
  },

  // Package 2 (PKG_02) - Contains remaining item from order 1
  {
    packageId: 2,
    orderItemId: 2, // Summer Dress (remaining quantity)
    quantityPacked: 1, // Completing the order (1 more of 2 total)
    version: 1,
    createdBy: 1,
    updatedBy: 1,
  },

  // Package 3 (PKG_03) - Contains items from order 7
  {
    packageId: 3,
    orderItemId: 3, // Smart Watch (quantity: 1)
    quantityPacked: 1, // Fully packed
    version: 1,
    createdBy: 1,
    updatedBy: 1,
  },

  // Package 4 (PKG_04) - Contains item from order 8
  {
    packageId: 4,
    orderItemId: 4, // Laptop Bag (quantity: 1)
    quantityPacked: 1, // Fully packed
    version: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];
