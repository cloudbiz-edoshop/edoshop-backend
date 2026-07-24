import { describe, expect, it } from "vitest";

import { updateRoleRequestSchema } from "@/modules/roles/roles.schema";

describe("updateRoleRequestSchema", () => {
  it("accepts underscore role names like w1_tech", () => {
    const result = updateRoleRequestSchema.safeParse({
      name: "w1_tech",
      description: "W1 Operator",
      permissions: [{ entityId: 1, operationId: 1 }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects role names with spaces", () => {
    const result = updateRoleRequestSchema.safeParse({
      name: "w1 tech",
      description: "Invalid role",
      permissions: [],
    });

    expect(result.success).toBe(false);
  });
});
