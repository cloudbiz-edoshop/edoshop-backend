import { describe, expect, it } from "vitest";

import {
  getWarehouseRayonPhysicalLayout,
  isSlotWithinWarehouseRayonPhysicalLayout,
  parseRayonIndexFromName,
} from "./warehouse-rayon-physical-layout.constants";

describe("warehouse-rayon-physical-layout", () => {
  it("parses rayon names", () => {
    expect(parseRayonIndexFromName("Rayon 4")).toBe(4);
    expect(parseRayonIndexFromName("4")).toBe(4);
    expect(parseRayonIndexFromName("RAYON1")).toBe(1);
    expect(parseRayonIndexFromName("Zone 4")).toBeNull();
  });

  it("returns W1 layout per rayon", () => {
    expect(getWarehouseRayonPhysicalLayout(1, "Rayon 1")).toEqual({
      rayonIndex: 1,
      maxColumnNumber: 5,
      maxColumnLabel: "E",
      rowCount: 6,
    });
    expect(getWarehouseRayonPhysicalLayout(1, "5")?.maxColumnLabel).toBe("C");
    expect(getWarehouseRayonPhysicalLayout(2, "1")).toBeNull();
    expect(getWarehouseRayonPhysicalLayout(1, "Rayon 6")).toBeNull();
  });

  it("validates bin slots against physical grid", () => {
    expect(
      isSlotWithinWarehouseRayonPhysicalLayout(1, "4", "D", 3),
    ).toBe(true);
    expect(
      isSlotWithinWarehouseRayonPhysicalLayout(1, "4", "E", 1),
    ).toBe(false);
    expect(
      isSlotWithinWarehouseRayonPhysicalLayout(1, "4", "Q", 3),
    ).toBe(false);
    expect(
      isSlotWithinWarehouseRayonPhysicalLayout(1, "2", "F", 6),
    ).toBe(true);
    expect(
      isSlotWithinWarehouseRayonPhysicalLayout(1, "2", "F", 7),
    ).toBe(false);
  });
});
