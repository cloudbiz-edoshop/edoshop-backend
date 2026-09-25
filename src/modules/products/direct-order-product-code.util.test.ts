import { describe, expect, it, vi } from "vitest";

import { assertValidDirectOrderProductCode } from "./direct-order-product-code.util";

vi.mock("@/db", () => ({
  default: {
    query: {
      items: {
        findFirst: vi.fn(async ({ where }: { where: unknown }) => {
          void where;
          return { id: 1, itemCode: "PK_A01_B1_S1_I1" };
        }),
      },
    },
  },
}));

describe("assertValidDirectOrderProductCode", () => {
  it("rejects legacy spreadsheet-style IDs", async () => {
    await expect(
      assertValidDirectOrderProductCode("DO-US-B1-E89AC"),
    ).rejects.toThrow(/legacy spreadsheet/i);
  });

  it("accepts a valid EWMS item code when it exists in the database", async () => {
    await expect(
      assertValidDirectOrderProductCode("PK_A01_B1_S1_I1"),
    ).resolves.toBeUndefined();
  });
});
