import { WarehouseIds } from "@/constants/warehouses.constants";

/** Every W1 rayon has six shelf rows; row 6 is reserved / not in use yet. */
export const WAREHOUSE_1_RAYON_ROW_COUNT = 6;

/**
 * Last column letter per rayon on Warehouse 1 (Steve physical layout).
 * Rayon 6 does not exist on the floor.
 */
export const WAREHOUSE_1_RAYON_MAX_COLUMN_LABEL: Record<number, string> = {
  1: "E",
  2: "F",
  3: "F",
  4: "D",
  5: "C",
};

export const columnLabelToNumber = (value: string) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .split("")
    .reduce((total, char) => {
      const code = char.charCodeAt(0);
      if (code < 65 || code > 90) {
        return Number.NaN;
      }
      return total * 26 + code - 64;
    }, 0);

export const numberToColumnLabel = (value: number) => {
  let number = value;
  let label = "";

  while (number > 0) {
    const remainder = (number - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    number = Math.floor((number - 1) / 26);
  }

  return label;
};

/** Parses "Rayon 4", "4", "RAYON4" → 4. Returns null when not a simple rayon index. */
export const parseRayonIndexFromName = (name: string | null | undefined): number | null => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return null;

  const prefixed = trimmed.match(/^rayon[\s-]*(\d+)$/i);
  if (prefixed) {
    const index = Number(prefixed[1]);
    return Number.isFinite(index) && index > 0 ? index : null;
  }

  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed);
    return index > 0 ? index : null;
  }

  const compact = trimmed.replace(/[^a-z0-9]/gi, "");
  const compactMatch = compact.match(/^rayon(\d+)$/i);
  if (compactMatch) {
    const index = Number(compactMatch[1]);
    return Number.isFinite(index) && index > 0 ? index : null;
  }

  return null;
};

export type WarehouseRayonPhysicalLayout = {
  rayonIndex: number;
  maxColumnNumber: number;
  maxColumnLabel: string;
  rowCount: number;
};

export const getWarehouseRayonPhysicalLayout = (
  warehouseId: number,
  rayonName: string | null | undefined,
): WarehouseRayonPhysicalLayout | null => {
  if (warehouseId !== WarehouseIds.WAREHOUSE_1) {
    return null;
  }

  const rayonIndex = parseRayonIndexFromName(rayonName);
  if (!rayonIndex) {
    return null;
  }

  const maxColumnLabel = WAREHOUSE_1_RAYON_MAX_COLUMN_LABEL[rayonIndex];
  if (!maxColumnLabel) {
    return null;
  }

  const maxColumnNumber = columnLabelToNumber(maxColumnLabel);
  if (!Number.isFinite(maxColumnNumber) || maxColumnNumber <= 0) {
    return null;
  }

  return {
    rayonIndex,
    maxColumnNumber,
    maxColumnLabel: maxColumnLabel.toUpperCase(),
    rowCount: WAREHOUSE_1_RAYON_ROW_COUNT,
  };
};

export const isSlotWithinWarehouseRayonPhysicalLayout = (
  warehouseId: number,
  rayonNumber: string,
  columnLabel: string,
  rowNumber: number,
): boolean => {
  const physical = getWarehouseRayonPhysicalLayout(warehouseId, rayonNumber);
  if (!physical) {
    return true;
  }

  if (physical.rayonIndex >= 6) {
    return false;
  }

  const columnNumber = columnLabelToNumber(columnLabel);
  if (!Number.isFinite(columnNumber) || columnNumber <= 0) {
    return false;
  }

  if (columnNumber > physical.maxColumnNumber) {
    return false;
  }

  if (!Number.isFinite(rowNumber) || rowNumber < 1 || rowNumber > physical.rowCount) {
    return false;
  }

  return true;
};
