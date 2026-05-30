/**
 * Warehouses available in the application
 * Using enum for better type safety and autocompletion
 */
export enum WarehouseName {
  WAREHOUSE_1 = "Warehouse 1",
  WAREHOUSE_2 = "Warehouse 2",
  WAREHOUSE_3 = "Warehouse 3",
  WAREHOUSE_4 = "Warehouse 4",
}

export const WarehouseIds: Record<string, number> = {
  WAREHOUSE_1: 1,
  WAREHOUSE_2: 2,
  WAREHOUSE_3: 3,
  WAREHOUSE_4: 4,
};

/**
 * Provides descriptions for warehouses
 */
export const WAREHOUSE_DESCRIPTIONS: Record<WarehouseName, string> = {
  [WarehouseName.WAREHOUSE_1]: "Warehouse 1",
  [WarehouseName.WAREHOUSE_2]: "Warehouse 2",
  [WarehouseName.WAREHOUSE_3]: "Warehouse 3",
  [WarehouseName.WAREHOUSE_4]: "Warehouse 4",
};
