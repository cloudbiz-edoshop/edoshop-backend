import { beforeEach, describe, expect, it, vi } from "vitest";

import db from "@/db";
import { findDirectOrderProductIdByIdentifier } from "@/lib/direct-order-product-identifier.util";

import { assertValidDirectOrderProductCode } from "./direct-order-product-code.util";

vi.mock("@/db", () => ({
  default: {
    query: {
      items: {
        findFirst: vi.fn(),
      },
      products: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
  },
}));

vi.mock("@/lib/direct-order-product-identifier.util", () => ({
  findDirectOrderProductIdByIdentifier: vi.fn(),
  normalizeProductIdentifierKey: (value: string) =>
    String(value ?? "")
      .trim()
      .replace(/[-\s]/g, "")
      .toUpperCase(),
}));

const mockSelectRows = (rows: unknown[]) => {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, innerJoin }));
  vi.mocked(db.select).mockReturnValue({ from } as never);
};

describe("assertValidDirectOrderProductCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectRows([]);
    vi.mocked(findDirectOrderProductIdByIdentifier).mockResolvedValue(null);
  });

  it("rejects legacy spreadsheet-style IDs when no warehouse item exists", async () => {
    vi.mocked(db.query.items.findFirst).mockResolvedValueOnce(undefined);
    await expect(
      assertValidDirectOrderProductCode("DO-US-B1-E89AC"),
    ).rejects.toThrow(/No EWMS warehouse item exists for this label ID/i);
  });

  it("accepts a valid EWMS item code when it exists in the database", async () => {
    vi.mocked(db.query.items.findFirst).mockResolvedValueOnce({
      id: 1,
      itemCode: "PK_A01_B1_S1_I1",
    } as never);
    await expect(
      assertValidDirectOrderProductCode("PK_A01_B1_S1_I1"),
    ).resolves.toBeUndefined();
  });

  it("accepts a legacy import code when a warehouse item row already exists", async () => {
    vi.mocked(db.query.items.findFirst).mockResolvedValueOnce({
      id: 2,
      itemCode: "DO-US-B1-E89AC",
    } as never);
    await expect(
      assertValidDirectOrderProductCode("DO-US-B1-E89AC"),
    ).resolves.toBeUndefined();
  });

  it("suggests editing the catalog when the ID already exists on a product", async () => {
    vi.mocked(db.query.items.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(findDirectOrderProductIdByIdentifier).mockResolvedValue(42);
    vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
      name: "Sac d'ordinateur TITEUF",
    } as never);

    await expect(
      assertValidDirectOrderProductCode("DO-CN-B2-E225Z"),
    ).rejects.toThrow(/already on the catalog/i);
  });
});
