export enum InventorySource {
  MANUAL = "manual",
  TRANSFER = "transfer",
  UNPACK = "unpack",
}

export const INVENTORY_SOURCE_DESCRIPTIONS: Record<InventorySource, string> = {
  [InventorySource.MANUAL]: "Created manually in EWMS",
  [InventorySource.TRANSFER]: "Registered through warehouse transfer receipt",
  [InventorySource.UNPACK]: "Generated from series unpacking",
};
