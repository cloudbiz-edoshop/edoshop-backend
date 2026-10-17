import { describe, expect, it } from "vitest";

import { classifyRouteCategory } from "./observability";

describe("classifyRouteCategory", () => {
  it("flags warehouse ticket routes as ticketing", () => {
    expect(classifyRouteCategory("/v1/warehouse-tickets/123")).toBe("ticketing");
  });

  it("flags payment routes", () => {
    expect(classifyRouteCategory("/v1/payment-methods")).toBe("payment");
  });

  it("flags role routes as permission", () => {
    expect(classifyRouteCategory("/v1/roles/1")).toBe("permission");
  });
});
