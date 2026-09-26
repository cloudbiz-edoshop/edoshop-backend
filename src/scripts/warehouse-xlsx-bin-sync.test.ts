import { describe, expect, it } from "vitest";

import {
  compactBinLocationKey,
  createBinResolver,
  parseSpreadsheetBinSlot,
  spreadsheetBinLocationKeys,
} from "./warehouse-xlsx-bin-location.util";

describe("warehouse bin location matching", () => {
  it("normalizes spaced spreadsheet bins", () => {
    expect(spreadsheetBinLocationKeys("1 B 4", 1)).toContain("1B4");
    expect(spreadsheetBinLocationKeys("4 A 2", 1)).toContain("4A2");
  });

  it("maps compact keys from EWMS rayon names", () => {
    expect(compactBinLocationKey("Rayon 4B2")).toBe("4B2");
    expect(compactBinLocationKey("W1-4B2")).toBe("4B2");
  });

  it("parses spreadsheet slots for provisioning", () => {
    expect(parseSpreadsheetBinSlot("4B2")).toEqual({
      locationCode: "4B2",
      rayonNumber: "4",
      columnLabel: "B",
      rowNumber: 2,
    });
    expect(parseSpreadsheetBinSlot("1 B 4")).toEqual({
      locationCode: "1B4",
      rayonNumber: "1",
      columnLabel: "B",
      rowNumber: 4,
    });
  });

  it("resolves spreadsheet bins against EWMS location codes", () => {
    const resolver = createBinResolver([
      { id: 10, locationCode: "Rayon 4B2" },
      { id: 11, locationCode: "1B4" },
    ]);

    expect(resolver.resolve("4B2", 1)?.id).toBe(10);
    expect(resolver.resolve("1 B 4", 1)?.id).toBe(11);
  });
});
