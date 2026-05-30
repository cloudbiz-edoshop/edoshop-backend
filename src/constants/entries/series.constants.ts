import { SERIES_ENTRIES } from "./entries.constants";
/**
 * Series codes enum for type safety and autocompletion
 */
export enum SeriesCode {
  ALPHA = "PK_A01_B1_S1",
  BETA = "PK_A01_B1_S2",
  GAMMA = "PK_A01_B2_S1",
  DELTA = "PK_A01_B2_S2",
  EPSILON = "PK_A01_B3_S1",
  ZETA = "PK_A01_B4_S1",
  ETA = "PK_A01_B4_S2",
  FETA = "PK_A01_B5_S1",
  THETA = "PK_A01_B5_S2",
}

/**
 * Optional: Descriptions for each series code
 */
export const SERIES_CODE_DESCRIPTIONS: Record<SeriesCode, string> = {
  [SeriesCode.ALPHA]: "Alpha Series",
  [SeriesCode.BETA]: "Beta Series",
  [SeriesCode.GAMMA]: "Gamma Series",
  [SeriesCode.DELTA]: "Delta Series",
  [SeriesCode.EPSILON]: "Epsilon Series",
  [SeriesCode.ZETA]: "Zeta Series",
  [SeriesCode.ETA]: "Eta Series",
  [SeriesCode.FETA]: "Feta Series",
  [SeriesCode.THETA]: "Theta Series",
};

/**
 * Sample data for seeding the series table
 */
export const SERIES_DATA = [
  {
    entryId: SERIES_ENTRIES[0].id,
    seriesCode: SeriesCode.ALPHA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
    colorId: 1,
    bundleId: 1,
  },
  {
    entryId: SERIES_ENTRIES[1].id,
    seriesCode: SeriesCode.BETA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 1,
    colorId: 2,
    bundleId: 1,
  },
  {
    entryId: SERIES_ENTRIES[2].id,
    seriesCode: SeriesCode.GAMMA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 2,
    colorId: 3,
    bundleId: 2,
  },
  {
    entryId: SERIES_ENTRIES[3].id,
    seriesCode: SeriesCode.DELTA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 1,
    colorId: 4,
    bundleId: 2,
  },
  {
    entryId: SERIES_ENTRIES[4].id,
    seriesCode: SeriesCode.EPSILON,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 2,
    updatedBy: 2,
    colorId: 5,
    bundleId: 3,
  },
  {
    entryId: SERIES_ENTRIES[5].id,
    seriesCode: SeriesCode.ZETA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: null,
    colorId: 1,
    bundleId: 6,
  },
  {
    entryId: SERIES_ENTRIES[6].id,
    seriesCode: SeriesCode.ETA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: null,
    colorId: 2,
    bundleId: 7,
  },
  {
    entryId: SERIES_ENTRIES[7].id,
    seriesCode: SeriesCode.FETA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: null,
    colorId: 2,
    bundleId: 7,
  },
  {
    entryId: SERIES_ENTRIES[8].id,
    seriesCode: SeriesCode.THETA,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: null,
    colorId: 2,
    bundleId: 7,
  },

];
