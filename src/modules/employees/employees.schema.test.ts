import { describe, expect, it } from "vitest";

import {
  createEmployeeRequestSchema,
  updateEmployeeRequestSchema,
} from "@/modules/employees/employees.schema";

describe("createEmployeeRequestSchema", () => {
  it("allows creating a team member without a WebApp password", () => {
    const result = createEmployeeRequestSchema.safeParse({
      email: "erine.tchuissi@edoshop.store",
      fullName: "Erine TCHUISSI",
      username: "Erine",
      password: "",
      roleId: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBeUndefined();
    }
  });

  it("validates WebApp password when one is provided", () => {
    const result = createEmployeeRequestSchema.safeParse({
      email: "erine.tchuissi@edoshop.store",
      fullName: "Erine TCHUISSI",
      username: "Erine",
      password: "short",
      roleId: 1,
    });

    expect(result.success).toBe(false);
  });
});

describe("updateEmployeeRequestSchema", () => {
  it("allows updating a permanent team member without roleExpiresAfter", () => {
    const result = updateEmployeeRequestSchema.safeParse({
      fullName: "Edwige Tchana Sokeng",
      username: "edwige",
      email: "edwige.tchana@edoshop.store",
      roleId: 1,
      isTempRole: false,
      roleExpiresAfter: null,
      password: "Edoshop.2026",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleExpiresAfter).toBeUndefined();
    }
  });
});
