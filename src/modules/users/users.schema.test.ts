import { describe, expect, it } from "vitest";

import { loginRequestSchema } from "@/modules/users/users.schema";

describe("loginRequestSchema", () => {
  it("accepts Nextcloud App Passwords without WebApp complexity rules", () => {
    const result = loginRequestSchema.safeParse({
      username: "team.member@edoshop.online",
      password: "abcdefghijklmnopqrstuvwxyz1234567890",
    });

    expect(result.success).toBe(true);
  });

  it("accepts long Nextcloud passwords beyond the WebApp 32 character limit", () => {
    const result = loginRequestSchema.safeParse({
      username: "team.member",
      password: `${"Abcd1234!".repeat(8)}`,
    });

    expect(result.success).toBe(true);
  });

  it("still enforces WebApp password rules for local email login", () => {
    const result = loginRequestSchema.safeParse({
      email: "team.member@edoshop.online",
      password: "simplepassword",
    });

    expect(result.success).toBe(false);
  });
});
