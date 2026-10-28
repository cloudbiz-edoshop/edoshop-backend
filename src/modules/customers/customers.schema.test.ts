import { describe, expect, it } from "vitest";

import { publicCustomerSignupRequestSchema } from "@/modules/customers/customers.schema";

describe("publicCustomerSignupRequestSchema", () => {
  const base = {
    phoneNumber: "+237675500863",
    countryCode: "CM",
    address: "Douala Bonamoussadi",
    password: "2OXu1CYqgxQbsqiz",
  };

  it("accepts names with apostrophes and hyphens", () => {
    const result = publicCustomerSignupRequestSchema.safeParse({
      ...base,
      fullName: "N'guemo Jean-Paul",
    });
    expect(result.success).toBe(true);
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
