import { describe, expect, it } from "vitest";

import { EntityType, OperationType } from "@/constants";

import { dashboardMetricsReadPairs } from "@/modules/dashboard/dashboard.acl";
import { warehouseListReadPairs } from "@/modules/warehouses/warehouses.acl";

const hasPair = (
  pairs: readonly { entity: string; operation: string }[],
  entity: string,
  operation: string,
) => pairs.some((pair) => pair.entity === entity && pair.operation === operation);

describe("staff ACL regression", () => {
  it("lets warehouse operators open dashboard metrics", () => {
    expect(
      hasPair(dashboardMetricsReadPairs, EntityType.WAREHOUSE_1, OperationType.READ),
    ).toBe(true);
    expect(
      hasPair(dashboardMetricsReadPairs, EntityType.WAREHOUSE_2, OperationType.READ),
    ).toBe(true);
    expect(
      hasPair(dashboardMetricsReadPairs, EntityType.ENTRIES, OperationType.READ),
    ).toBe(true);
  });

  it("lets ticket creators list warehouses without warehouses:read", () => {
    expect(
      hasPair(
        warehouseListReadPairs,
        EntityType.TICKET_PAGE_CREATE,
        OperationType.READ,
      ),
    ).toBe(true);
    expect(
      hasPair(warehouseListReadPairs, EntityType.WAREHOUSE_2, OperationType.READ),
    ).toBe(true);
  });
});
