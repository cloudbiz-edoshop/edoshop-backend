import { PKG_ENTRIES } from "./entries.constants";
/**
 * Package codes enum for standardized values
 */
export enum PackageCode {
  PACK001 = "PKG_01",
  PACK002 = "PKG_02",
  PACK003 = "PKG_03",
  PACK004 = "PKG_04",
  PACK005 = "PKG_05",
  PACK006 = "PKG_06",
  PACK007 = "PKG_07",
  PACK008 = "PKG_08",
  PACK009 = "PKG_09",
  PACK010 = "PKG_10",

}

/**
 * Descriptions for package codes (optional)
 */
export const PACKAGE_CODE_DESCRIPTIONS: Record<PackageCode, string> = {
  [PackageCode.PACK001]: "Standard package",
  [PackageCode.PACK002]: "Priority package",
  [PackageCode.PACK003]: "Bulk package",
  [PackageCode.PACK004]: "New package",
  [PackageCode.PACK005]: "Fifth package",
  [PackageCode.PACK006]: "Sixth package",
  [PackageCode.PACK007]: "Seventh package",
  [PackageCode.PACK008]: "Eighth package",
  [PackageCode.PACK009]: "Ninth package",
  [PackageCode.PACK010]: "Tenth package",
};

/**
 * Seed data for the `packages` table
 */
export const PACKAGES_DATA = [
  {
    entryId: PKG_ENTRIES[0].id,
    packageCode: PackageCode.PACK001,
    binLocation: "BIN-A1",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-15T10:30:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[1].id,
    packageCode: PackageCode.PACK002,
    binLocation: "BIN-B2",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-15T11:00:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
  },
  {
    entryId: PKG_ENTRIES[2].id,
    packageCode: PackageCode.PACK003,
    binLocation: "BIN-C3",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-16T09:15:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[3].id,
    packageCode: PackageCode.PACK004,
    binLocation: "BIN-C4",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-16T14:30:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[4].id,
    packageCode: PackageCode.PACK005,
    binLocation: "BIN-C5",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-17T08:45:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[5].id,
    packageCode: PackageCode.PACK006,
    binLocation: "BIN-C6",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-17T10:20:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[6].id,
    packageCode: PackageCode.PACK007,
    binLocation: "BIN-C7",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-17T10:20:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[7].id,
    packageCode: PackageCode.PACK008,
    binLocation: "BIN-C8",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-18T09:00:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[8].id,
    packageCode: PackageCode.PACK009,
    binLocation: "BIN-C9",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-18T09:00:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },
  {
    entryId: PKG_ENTRIES[9].id,
    packageCode: PackageCode.PACK010,
    binLocation: "BIN-C10",
    packageStatusId: 2,
    lastPackedAt: new Date("2024-01-18T09:00:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
  },

];
