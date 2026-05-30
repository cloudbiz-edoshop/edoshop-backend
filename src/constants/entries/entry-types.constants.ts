/**
 * Entry types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum EntryType {
  BUNDLE = "BUNDLE",
  SERIES = "SERIES",
  ITEM = "ITEM",
  PACKAGE = "PACKAGE",
}

export const EntryTypeIds = {
  BUNDLE: 1,
  SERIES: 2,
  ITEM: 3,
  PACKAGE: 4,
};

/**
 * Provides descriptions for entry types
 */
export const ENTRY_TYPE_DESCRIPTIONS: Record<EntryType, string> = {
  [EntryType.BUNDLE]: "Bundle",
  [EntryType.SERIES]: "Series",
  [EntryType.ITEM]: "Item",
  [EntryType.PACKAGE]: "Package",
};

export const EntryTypeIdToEnum: Record<number, EntryType> = {
  1: EntryType.BUNDLE,
  2: EntryType.SERIES,
  3: EntryType.ITEM,
  4: EntryType.PACKAGE,
};
