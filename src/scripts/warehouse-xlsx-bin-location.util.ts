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

export const spreadsheetBinLocationKeys = (
  rawBinLocation: string,
  warehouseId: number,
) => {
  const trimmed = String(rawBinLocation ?? "").trim();
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
