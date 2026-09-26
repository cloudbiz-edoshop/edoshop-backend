/** Matches Rayons UI `displayLocationCode` and spreadsheet bin labels. */
export const normalizeBinLocationKey = (value: string) =>
  String(value ?? "")
    .trim()
    .replace(/^W\d+-/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();

/** Trailing rayon + column + row segment (e.g. RAYON4B2 → 4B2). */
export const compactBinLocationKey = (value: string) => {
  const normalized = normalizeBinLocationKey(value);
  if (!normalized) return null;
  const match = normalized.match(/(\d+[A-Z]+\d+)$/);
  return match ? match[1] : normalized;
};

/** Excel often appends "." to aisle codes (e.g. 4E1. after scientific-notation formatting). */
export const normalizeSpreadsheetBinLocationCell = (rawBinLocation: string) => {
  const trimmed = String(rawBinLocation ?? "").trim();
  if (!trimmed.endsWith(".")) {
    return trimmed;
  }

  const core = trimmed.slice(0, -1).trim();
  const compact = core.replace(/\s+/g, "");
  if (/^\d+[A-Za-z]+\d+$/.test(compact)) {
    return core;
  }
  if (/^\d+\s+[A-Za-z]\s+\d+$/i.test(core)) {
    return core;
  }

  return trimmed;
};

export const spreadsheetBinLocationKeys = (
  rawBinLocation: string,
  warehouseId: number,
) => {
  const trimmed = normalizeSpreadsheetBinLocationCell(rawBinLocation);
  if (!trimmed || /^bin\s*loc/i.test(trimmed)) {
    return [];
  }

  const keys = new Set<string>();
  keys.add(normalizeBinLocationKey(trimmed));
  keys.add(normalizeBinLocationKey(`W${warehouseId}-${trimmed}`));

  const compact = compactBinLocationKey(trimmed);
  if (compact) keys.add(compact);

  const spaced = trimmed.match(/^(\d+)\s+([A-Za-z])\s+(\d+)$/i);
  if (spaced) {
    keys.add(`${spaced[1]}${spaced[2].toUpperCase()}${spaced[3]}`);
  }

  const compactSpaced = trimmed.match(/^(\d+)\s*([A-Za-z])\s*(\d+)$/i);
  if (compactSpaced) {
    keys.add(
      `${compactSpaced[1]}${compactSpaced[2].toUpperCase()}${compactSpaced[3]}`,
    );
  }

  return [...keys].filter(Boolean);
};

export type SpreadsheetBinSlot = {
  locationCode: string;
  rayonNumber: string;
  columnLabel: string;
  rowNumber: number;
};

/** Reject Excel noise (200000, 2E5., 4000) — not real aisle codes like 4B2. */
export const isPlausibleSpreadsheetBinLocation = (rawBinLocation: string) => {
  const trimmed = normalizeSpreadsheetBinLocationCell(rawBinLocation);
  if (!trimmed || /^bin\s*loc/i.test(trimmed)) {
    return false;
  }

  const compact = compactBinLocationKey(trimmed);
  if (!compact) return false;
  if (/^\d{4,}$/.test(compact)) return false;
  if (trimmed.includes(".")) return false;

  for (const key of spreadsheetBinLocationKeys(trimmed, 1)) {
    const match = key.match(/^(\d+)([A-Z]+)(\d+)$/);
    if (!match) continue;
    const rowNumber = Number.parseInt(match[3], 10);
    if (!Number.isFinite(rowNumber) || rowNumber <= 0 || rowNumber > 99) {
      continue;
    }
    if (!/^[A-Z]+$/.test(match[2])) continue;
    return true;
  }

  return false;
};

/** Parse spreadsheet bin cell into rayon / shelf column / row (e.g. 4B2, 1 B 4). */
export const parseSpreadsheetBinSlot = (
  rawBinLocation: string,
): SpreadsheetBinSlot | null => {
  if (!isPlausibleSpreadsheetBinLocation(rawBinLocation)) {
    return null;
  }

  const keys = spreadsheetBinLocationKeys(rawBinLocation, 1);
  for (const key of keys) {
    const match = key.match(/^(\d+)([A-Z]+)(\d+)$/);
    if (!match) continue;
    const rowNumber = Number.parseInt(match[3], 10);
    if (!Number.isFinite(rowNumber) || rowNumber <= 0) continue;
    return {
      locationCode: key,
      rayonNumber: match[1],
      columnLabel: match[2],
      rowNumber,
    };
  }
  return null;
};

export type BinRecord = { id: number; locationCode: string };

export type BinResolver = {
  resolve: (
    rawBinLocation: string,
    warehouseId: number,
  ) => BinRecord | null;
};

export const createBinResolver = (rows: BinRecord[]): BinResolver => {
  const byKey = new Map<string, BinRecord>();
  const ambiguousKeys = new Set<string>();

  const register = (key: string, row: BinRecord) => {
    if (!key) return;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      return;
    }
    if (existing.id !== row.id) {
      ambiguousKeys.add(key);
    }
  };

  for (const row of rows) {
    const keys = new Set<string>([
      normalizeBinLocationKey(row.locationCode),
      compactBinLocationKey(row.locationCode) ?? "",
    ]);
    for (const key of keys) {
      register(key, row);
    }
  }

  return {
    resolve(rawBinLocation, warehouseId) {
      for (const key of spreadsheetBinLocationKeys(rawBinLocation, warehouseId)) {
        if (ambiguousKeys.has(key)) continue;
        const hit = byKey.get(key);
        if (hit) return hit;
      }
      return null;
    },
  };
};
