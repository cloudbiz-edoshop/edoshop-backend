import { describe, expect, it } from "vitest";

import { isAdminPanelTeamMemberUser } from "@/lib/admin-panel-membership";

describe("isAdminPanelTeamMemberUser", () => {
  it("allows standalone super admins", () => {
    expect(
      isAdminPanelTeamMemberUser({
        isAdmin: true,
        employee: null,
      }),
    ).toBe(true);
  });

  it("allows active employees", () => {
    expect(
      isAdminPanelTeamMemberUser({
        isAdmin: false,
        employee: { isDeleted: false },
      }),
    ).toBe(true);
  });

  it("rejects users without team membership", () => {
    expect(
      isAdminPanelTeamMemberUser({
        isAdmin: false,
        employee: null,
      }),
    ).toBe(false);
  });

  it("rejects deleted employees", () => {
    expect(
      isAdminPanelTeamMemberUser({
        isAdmin: false,
        employee: { isDeleted: true },
      }),
    ).toBe(false);
  });
});
