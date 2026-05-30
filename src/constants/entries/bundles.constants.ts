import { BUNDLE_ENTRIES } from "./entries.constants";

/**
 * Bundle types enum for better type safety
 */
export enum BundleCode {
  FIRST = "PK_A01_B1",
  SECOND = "PK_A01_B2",
  THIRD = "PK_A01_B3",
  FOURTH = "PK_A01_B4",
  FIFTH = "PK_A01_B5",
  SIXTH = "PK_A01_B6",
  SEVENTH = "PK_A01_B7",
}

/**
 * Provides descriptions for bundle codes (optional)
 */
export const BUNDLE_CODE_DESCRIPTIONS: Record<BundleCode, string> = {
  [BundleCode.FIRST]: "First Bundle",
  [BundleCode.SECOND]: "Second Bundle",
  [BundleCode.THIRD]: "Third Bundle",
  [BundleCode.FOURTH]: "Fourth Bundle",
  [BundleCode.FIFTH]: "Fifth Bundle",
  [BundleCode.SIXTH]: "Sixth Bundle",
  [BundleCode.SEVENTH]: "Seventh Bundle",
};

/**
 * Sample bundles data for seeding
 */
export const BUNDLES_DATA = [
  {
    entryId: BUNDLE_ENTRIES[0].id,
    bundleCode: BundleCode.FIRST,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: BUNDLE_ENTRIES[1].id,
    bundleCode: BundleCode.SECOND,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 2,
  },
  {
    entryId: BUNDLE_ENTRIES[2].id,
    bundleCode: BundleCode.THIRD,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 1,
  },
  {
    entryId: BUNDLE_ENTRIES[3].id,
    bundleCode: BundleCode.FOURTH,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: BUNDLE_ENTRIES[4].id,
    bundleCode: BundleCode.FIFTH,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: BUNDLE_ENTRIES[5].id,
    bundleCode: BundleCode.SIXTH,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: BUNDLE_ENTRIES[6].id,
    bundleCode: BundleCode.SEVENTH,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
];
