import { describe, expect, it } from "vitest";

import { publicCustomerSignupRequestSchema } from "@/modules/customers/customers.schema";

describe("publicCustomerSignupRequestSchema", () => {
  const base = {
    phoneNumber: "+237675500863",
    countryCode: "CM",
    address: "Douala Bonamoussadi",
    password: "2OXu1CYqgxQbsqiz",
  };

  it("accepts any reasonable display name (no format regex)", () => {
    const names = [
      "N'guemo Jean-Paul",
      "Mary O'Brien",
      "123 Shop",
      "محمد",
      "Test @nickname",
    ];
    for (const fullName of names) {
      const result = publicCustomerSignupRequestSchema.safeParse({
        ...base,
        fullName,
      });
      expect(result.success, fullName).toBe(true);
    }
  });

  it("rejects invalid phone format with a clear message", () => {
    const result = publicCustomerSignupRequestSchema.safeParse({
      ...base,
      fullName: "Jean Paul",
      phoneNumber: "+237",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/phone/i);
    }
  });
});
