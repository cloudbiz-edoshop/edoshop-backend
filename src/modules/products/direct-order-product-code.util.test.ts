import { describe, expect, it, vi } from "vitest";

import db from "@/db";

import { assertValidDirectOrderProductCode } from "./direct-order-product-code.util";

vi.mock("@/db", () => ({
  default: {
    query: {
      items: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe("assertValidDirectOrderProductCode", () => {
  it("rejects legacy spreadsheet-style IDs when no warehouse item exists", async () => {
    vi.mocked(db.query.items.findFirst).mockResolvedValueOnce(undefined);
    await expect(
      assertValidDirectOrderProductCode("DO-US-B1-E89AC"),
    ).rejects.toThrow(/spreadsheet-only/i);
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
});
