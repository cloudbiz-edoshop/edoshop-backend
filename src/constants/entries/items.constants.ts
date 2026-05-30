import { ITEM_ENTRIES } from "./entries.constants";

/**
 * Item codes enum for type safety and autocompletion
 */
export enum ItemCode {
  ITEM_1 = "PK_A01_B1_S1_I1",
  ITEM_2 = "PK_A01_B1_S1_I2",
  ITEM_3 = "PK_A01_B1_S2_I1",
  ITEM_4 = "PK_A01_B1_S2_I2",
  ITEM_5 = "PK_A01_B2_S1_I1",
  ITEM_6 = "PK_A01_B2_S1_I2",
  ITEM_7 = "PK_A01_B2_S2_I1",
  ITEM_8 = "PK_A01_B2_S2_I2",
  ITEM_9 = "PK_A01_B3_S1_I1",
  ITEM_10 = "PK_A01_B3_S1_I2",
  ITEM_11 = "PK_A01_B4_S1_I1",
}

/**
 * Descriptions for item codes (optional)
 */
export const ITEM_CODE_DESCRIPTIONS: Record<ItemCode, string> = {
  [ItemCode.ITEM_1]: "First item description",
  [ItemCode.ITEM_2]: "Second item description",
  [ItemCode.ITEM_3]: "Third item description",
  [ItemCode.ITEM_4]: "Fourth item description",
  [ItemCode.ITEM_5]: "Fifth item description",
  [ItemCode.ITEM_6]: "Sixth item description",
  [ItemCode.ITEM_7]: "Seventh item description",
  [ItemCode.ITEM_8]: "Eighth item description",
  [ItemCode.ITEM_9]: "Ninth item description",
  [ItemCode.ITEM_10]: "Tenth item description",
  [ItemCode.ITEM_11]: "Eleventh item description",
};

/**
 * Seed data for the `items` table
 */
export const ITEMS_DATA = [
  {
    entryId: ITEM_ENTRIES[0].id,
    seriesId: 1, // PK_A01_B1_S1
    itemCode: ItemCode.ITEM_1,
    sizeId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: ITEM_ENTRIES[1].id,
    seriesId: 1, // PK_A01_B1_S1
    itemCode: ItemCode.ITEM_2,
    sizeId: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 1,
  },
  {
    entryId: ITEM_ENTRIES[2].id,
    seriesId: 2, // PK_A01_B1_S2
    itemCode: ItemCode.ITEM_3,
    sizeId: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: ITEM_ENTRIES[3].id,
    seriesId: 2, // PK_A01_B1_S2
    itemCode: ItemCode.ITEM_4,
    sizeId: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: ITEM_ENTRIES[4].id,
    seriesId: 3, // PK_A01_B2_S1
    itemCode: ItemCode.ITEM_5,
    sizeId: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: ITEM_ENTRIES[5].id,
    seriesId: 6,
    itemCode: ItemCode.ITEM_6,
    sizeId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: null,
  },
  {
    entryId: ITEM_ENTRIES[6].id,
    seriesId: 6,
    itemCode: ItemCode.ITEM_7,
    sizeId: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: null,
  },
  {
    entryId: ITEM_ENTRIES[7].id,
    seriesId: 7,
    itemCode: ItemCode.ITEM_8,
    sizeId: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: null,
  },

];
