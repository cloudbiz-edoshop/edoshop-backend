import { describe, expect, it } from "vitest";

import {
  generateOrderCode,
  resolveOrderCodeStoreKind,
} from "./order-code.util";
import { OrderTypeIds } from "@/constants/order-types.constants";

describe("order-code.util", () => {
  it("generates distinguishable direct and dropshipping prefixes", () => {
    const direct = generateOrderCode(OrderTypeIds.DIRECT_ORDER);
    const dropship = generateOrderCode(OrderTypeIds.DROPSHIPPING);
    expect(direct).toMatch(/^ORD-DO-\d{8}-\d{4}$/);
    expect(dropship).toMatch(/^ORD-DS-\d{8}-\d{4}$/);
  });

  it("resolves store kind from order code", () => {
    expect(resolveOrderCodeStoreKind("ORD-DO-20261007-1234")).toBe("direct");
    expect(resolveOrderCodeStoreKind("ORD-DS-20261007-5678")).toBe("dropshipping");
    expect(resolveOrderCodeStoreKind("ORD-20261007-9999")).toBe("legacy");
  });
});
